import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, ChevronDown, FileImage, FileText, FolderOpen, Newspaper, Plus, Send, Server, Settings, Workflow } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ConversationItem } from '@/components/ConversationItem'
import { useToast } from '@/lib/toast'
import { useAppStore } from '@/store'
import type {
  ActiveAIModelInfo,
  AIModelConfig,
  ConversationHistory,
  ConversationMessage,
  NewsArticle,
  SavedNews,
  UserConfig,
  WorkflowDefinition,
} from '@/types'
import { chat as chatWithAi } from '@/lib/api/chat'
import { getErrorMessage } from '@/lib/errors'
import { createSavedNews } from '@/lib/api/news'
import { getConfig, switchAIModel, updateConfig, uploadWorkspaceAsset } from '@/lib/api/config'
import { parseWorkflowCommand, getWorkflowExecutions, getWorkflows } from '@/lib/api/workflows'

const thinkingMessages = [
  '正在理解你的问题',
  '正在整理可用信息',
  '正在生成更清晰的回答',
] as const

function isModelReady(model?: {
  provider?: string | null
  apiKey?: string
  modelName?: string
  baseUrl?: string
} | null) {
  if (!model?.provider) {
    return false
  }

  if (model.provider === 'ollama' || model.provider === 'llamacpp') {
    return Boolean(model.modelName || model.baseUrl)
  }

  return Boolean(model.apiKey && model.modelName)
}

function buildActiveModelInfo(config: {
  aiModel: {
    name?: string
    provider?: ActiveAIModelInfo['provider']
    modelName?: string
    baseUrl?: string
  }
  aiModels: Array<{
    name?: string
    provider?: ActiveAIModelInfo['provider']
    modelName?: string
    baseUrl?: string
    isActive?: boolean
  }>
}): ActiveAIModelInfo | null {
  const primaryReady = isModelReady(config.aiModel)
  const fallbackModel = config.aiModels?.find((item) => item.isActive) || config.aiModels?.[0]
  const fallbackReady = isModelReady(fallbackModel)
  const selectedModel = primaryReady ? config.aiModel : fallbackReady ? fallbackModel : null

  if (!selectedModel?.provider) {
    return null
  }

  return {
    configured: true,
    provider: selectedModel.provider,
    configuredName: selectedModel.name || '',
    configuredModelName: selectedModel.modelName || '',
    effectiveModelName: selectedModel.modelName || selectedModel.name || '',
    baseUrl: selectedModel.baseUrl || '',
    source: primaryReady ? 'primary' : 'fallback',
  }
}

function getPathLeafLabel(filePath?: string) {
  if (!filePath) {
    return '未设置目录'
  }

  const normalized = filePath.replace(/[\\]+/g, '/').replace(/\/$/, '')
  const segments = normalized.split('/')
  return segments[segments.length - 1] || filePath
}

function clampChatText(value: string, maxChars: number) {
  const normalized = value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
  if (normalized.length <= maxChars) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`
}

export function Chat() {
  type QueuedSubmission = {
    id: string
    rawMessage: string
    requestMessage: string
    workflow: WorkflowDefinition | null
    referencedNews?: NewsArticle | null
    createdAt: string
  }

  type UploadedAsset = {
    fileName: string
    relativePath: string
    mimeType: string
  }

  const location = useLocation()
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const [inputMessage, setInputMessage] = useState('')
  const [hasAiModelConfig, setHasAiModelConfig] = useState(true)
  const [isCheckingConfig, setIsCheckingConfig] = useState(true)
  const [isSavingToDraft, setIsSavingToDraft] = useState(false)
  const [showWorkflowSuggestions, setShowWorkflowSuggestions] = useState(false)
  const [thinkingStep, setThinkingStep] = useState(0)
  const [activeAiModel, setActiveAiModel] = useState<ActiveAIModelInfo | null>(null)
  const [pendingSaveContent, setPendingSaveContent] = useState<string | null>(null)
  const [saveTargetType, setSaveTargetType] = useState<'news' | 'file'>('news')
  const [saveFileFormat, setSaveFileFormat] = useState<'md' | 'txt' | 'json' | 'html'>('md')
  const [queuedSubmissions, setQueuedSubmissions] = useState<QueuedSubmission[]>([])
  const [quotedNews, setQuotedNews] = useState<NewsArticle | null>(null)
  const [referencedNewsMap, setReferencedNewsMap] = useState<Record<string, NewsArticle>>({})
  const [configSnapshot, setConfigSnapshot] = useState<UserConfig | null>(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [isSwitchingModel, setIsSwitchingModel] = useState(false)
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false)
  const [isUploadingAsset, setIsUploadingAsset] = useState(false)
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([])
  const [modelCheckDetails, setModelCheckDetails] = useState<{
    primaryLabel: string
    primaryReady: boolean
    fallbackLabel: string
    fallbackReady: boolean
    lastError: string
  }>({
    primaryLabel: '未检测到主模型配置',
    primaryReady: false,
    fallbackLabel: '未检测到候选模型',
    fallbackReady: false,
    lastError: '',
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const conversationMessagesRef = useRef<ConversationMessage[]>([])
  const conversationHistoriesRef = useRef<ConversationHistory[]>([])
  const currentConversationIdRef = useRef<string | null>(null)
  const conversationIdRef = useRef<string | undefined>(conversationId)
  const { showToast } = useToast()
  const {
    conversationMessages,
    conversationHistories,
    currentConversationId,
    selectedWorkflow,
    workflows,
    isLoading,
    savedNews,
    addConversationMessage,
    upsertConversationHistory,
    setCurrentConversationId,
    loadConversationMessages,
    setIsLoading,
    setSavedNews,
    setWorkflows,
    setWorkflowExecutions,
    addWorkflowExecution,
    setSelectedWorkflow,
    startNewConversation,
  } = useAppStore()

  const configuredAiModels = useMemo(
    () => (configSnapshot?.aiModels || []).filter((model) => isModelReady(model)),
    [configSnapshot]
  )

  const currentWorkspacePath = configSnapshot?.workspace?.rootPath || ''
  const currentWorkspaceLabel = getPathLeafLabel(currentWorkspacePath)
  const currentModelLabel =
    activeAiModel?.effectiveModelName ||
    activeAiModel?.configuredModelName ||
    activeAiModel?.configuredName ||
    '未设置模型'

  useEffect(() => {
    conversationMessagesRef.current = conversationMessages
  }, [conversationMessages])

  useEffect(() => {
    conversationHistoriesRef.current = conversationHistories
  }, [conversationHistories])

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId
  }, [currentConversationId])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages, isLoading])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!plusMenuRef.current?.contains(event.target as Node)) {
        setShowActionMenu(false)
      }

      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setShowModelMenu(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      setThinkingStep(0)
      return
    }

    const timer = window.setInterval(() => {
      setThinkingStep((current) => (current + 1) % thinkingMessages.length)
    }, 1600)

    return () => window.clearInterval(timer)
  }, [isLoading])

  useEffect(() => {
    if (conversationId === 'new') {
      if (
        currentConversationId !== null ||
        conversationMessages.length > 0 ||
        selectedWorkflow !== null
      ) {
        startNewConversation()
      }
      return
    }

    if (!conversationId) {
      return
    }

    const history = conversationHistories.find((item) => item.id === conversationId)
    if (!history || currentConversationId === history.id) {
      return
    }

    setCurrentConversationId(history.id)
    loadConversationMessages(history.messages)
  }, [
    currentConversationId,
    conversationHistories,
    conversationId,
    conversationMessages,
    loadConversationMessages,
    selectedWorkflow,
    setCurrentConversationId,
    startNewConversation,
  ])

  const refreshConfigState = async (showLoading = false) => {
    let hasValidConfig = false

    try {
      if (showLoading) {
        setIsCheckingConfig(true)
      }

      const config = await getConfig('1')
      setConfigSnapshot(config)

      const activeModel = config.aiModels?.find((item) => item.isActive) || config.aiModels?.[0]
      const primaryReady = isModelReady(config.aiModel)
      const fallbackReady = isModelReady(activeModel)
      hasValidConfig = primaryReady || fallbackReady

      setHasAiModelConfig(hasValidConfig)
      setActiveAiModel(
        buildActiveModelInfo({
          aiModel: config.aiModel,
          aiModels: config.aiModels || [],
        })
      )
      setModelCheckDetails({
        primaryLabel: config.aiModel.name || config.aiModel.modelName || '主模型未填写名称',
        primaryReady,
        fallbackLabel:
          activeModel?.name ||
          activeModel?.modelName ||
          (config.aiModels.length > 0 ? '已存在候选模型但信息不完整' : '未检测到候选模型'),
        fallbackReady,
        lastError: '',
      })
    } catch (_error) {
      setConfigSnapshot(null)
      setHasAiModelConfig(false)
      setActiveAiModel(null)
      hasValidConfig = false
      setModelCheckDetails({
        primaryLabel: '未能读取主模型配置',
        primaryReady: false,
        fallbackLabel: '未能读取候选模型',
        fallbackReady: false,
        lastError: '当前无法读取系统配置，请检查后端服务是否已启动。',
      })
    } finally {
      if (!hasValidConfig) {
        setHasAiModelConfig(false)
      }

      if (showLoading) {
        setIsCheckingConfig(false)
      }
    }
  }

  useEffect(() => {
    void refreshConfigState(true)
  }, [location.pathname])

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const [workflowResponse, executionResponse] = await Promise.all([
          getWorkflows(),
          getWorkflowExecutions('1'),
        ])
        setWorkflows(workflowResponse.data)
        setWorkflowExecutions(executionResponse.data)
      } catch (error) {
        console.error('获取工作台数据失败:', error)
      }
    }

    fetchWorkspace()
  }, [setWorkflowExecutions, setWorkflows])

  const currentCommandToken = useMemo(() => {
    const match = inputMessage.match(/^(\/\+?[^\s]*)/)
    return match?.[1] || ''
  }, [inputMessage])

  const filteredWorkflows = useMemo(() => {
    const token = currentCommandToken.replace(/^\/\+?/, '').toLowerCase()
    if (!token) {
      return workflows.slice(0, 8)
    }

    return workflows.filter((workflow) => {
      const candidates = [
        workflow.name,
        workflow.displayName,
        workflow.invocation.primary,
        ...workflow.invocation.aliases,
      ]
      return candidates.some((item) => item.toLowerCase().includes(token))
    })
  }, [currentCommandToken, workflows])

  const hasConversationStarted = conversationMessages.length > 0 || queuedSubmissions.length > 0 || isLoading

  const handleSelectWorkflow = (workflow: WorkflowDefinition, insertCommand = false) => {
    setSelectedWorkflow(workflow)
    setShowWorkflowSuggestions(false)
    if (insertCommand) {
      setInputMessage((current) => {
        const withoutCommand = current.replace(/^(\/\+?[^\s]*)\s*/, '')
        return `${workflow.invocation.primary}${withoutCommand ? ` ${withoutCommand}` : ' '}`
      })
    }
  }

  const processSubmission = async (submission: QueuedSubmission, loadingAlreadyStarted: boolean = false) => {
    try {
      if (!loadingAlreadyStarted) {
        setIsLoading(true)
      }

      const currentMessages = conversationMessagesRef.current
      const currentHistories = conversationHistoriesRef.current
      const currentHistoryId = currentConversationIdRef.current
      const activeWorkflow = submission.workflow
      const userMessage: ConversationMessage = {
        id: submission.id,
        role: 'user',
        content: submission.rawMessage,
        referencedNewsId: submission.referencedNews?.id,
        workflowId: activeWorkflow?.id,
        workflowInvocation: activeWorkflow?.invocation.primary,
        messageType: activeWorkflow ? 'workflow' : 'plain',
        timestamp: submission.createdAt,
      }

      addConversationMessage(userMessage)

      const existingHistory = currentHistoryId
        ? currentHistories.find((item) => item.id === currentHistoryId)
        : null
      const now = submission.createdAt
      const historyId = existingHistory?.id || currentHistoryId || submission.id
      const messagesWithUser = [...currentMessages, userMessage]
      const firstMessage = messagesWithUser.find((msg) => msg.role === 'user')

      const pendingHistory: ConversationHistory = {
        id: historyId,
        title: firstMessage?.content.substring(0, 50) || '未命名任务',
        messages: messagesWithUser,
        createdAt: existingHistory?.createdAt || now,
        updatedAt: now,
      }

      upsertConversationHistory(pendingHistory)

      if (conversationIdRef.current !== historyId) {
        navigate(`/chat/${historyId}`, { replace: true })
      }

      const referencedPrompt = submission.referencedNews
        ? [
            `引用新闻标题：${submission.referencedNews.title}`,
            `引用新闻来源：${submission.referencedNews.source}`,
            `引用新闻发布时间：${submission.referencedNews.publishedAt}`,
            `引用新闻原文：${submission.referencedNews.url}`,
            `引用新闻摘要：${submission.referencedNews.content}`,
            `引用新闻关键词：${submission.referencedNews.relatedKeywords.join('、') || '未标注'}`,
          ].join('\n')
        : ''

      const data = await chatWithAi({
        userId: '1',
        message: referencedPrompt ? `${referencedPrompt}\n\n用户任务：${submission.requestMessage}` : submission.requestMessage,
        history: currentMessages.slice(-12).map((msg) => ({
          role: msg.role,
          content: clampChatText(msg.content, 800),
        })),
      })

      if (data.workflow) {
        setSelectedWorkflow(data.workflow)
      }

      if (data.execution) {
        addWorkflowExecution(data.execution)
      }

      const aiMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        referencedNewsId: submission.referencedNews?.id,
        workflowId: data.workflow?.id || activeWorkflow?.id,
        workflowInvocation: data.workflow?.invocation.primary || activeWorkflow?.invocation.primary,
        messageType: data.workflow ? 'result' : 'plain',
        executionId: data.execution?.id,
        artifacts: data.artifacts,
        timestamp: new Date().toISOString(),
      }
      addConversationMessage(aiMessage)

      const updatedMessages = [...currentMessages, userMessage, aiMessage]
      const completedAt = new Date().toISOString()

      const nextHistory: ConversationHistory = {
        id: historyId,
        title: firstMessage?.content.substring(0, 50) || '未命名任务',
        messages: updatedMessages,
        createdAt: existingHistory?.createdAt || now,
        updatedAt: completedAt,
      }

      upsertConversationHistory(nextHistory)
    } catch (error) {
      showToast({
        title: 'AI 服务暂时不可用',
        message: `${getErrorMessage(error, '请求失败')}，请检查 AI 模型配置和服务状态。`,
        variant: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoading || queuedSubmissions.length === 0) {
      return
    }

    const [nextSubmission, ...restSubmissions] = queuedSubmissions
    setIsLoading(true)
    setQueuedSubmissions(restSubmissions)
    void processSubmission(nextSubmission, true)
  }, [isLoading, queuedSubmissions])

  const handleSendMessage = async () => {
    const rawMessage = inputMessage.trim()
    if (!rawMessage) return

    try {
      let activeWorkflow = selectedWorkflow
      let requestMessage = rawMessage

      if (rawMessage.startsWith('/')) {
        const parsed = await parseWorkflowCommand(rawMessage)
        if (!parsed.matched || !parsed.workflow) {
          showToast({
            title: '未找到工作流',
            message: parsed.error || '请输入正确的工作流命令，或从候选列表中选择。',
            variant: 'error',
          })
          return
        }
        activeWorkflow = parsed.workflow
        setSelectedWorkflow(parsed.workflow)
      } else if (activeWorkflow) {
        requestMessage = `${activeWorkflow.invocation.primary} ${rawMessage}`
      }

      const submission: QueuedSubmission = {
        id: Date.now().toString(),
        rawMessage,
        requestMessage,
        workflow: activeWorkflow,
        referencedNews: quotedNews,
        createdAt: new Date().toISOString(),
      }

      setInputMessage('')
      setShowWorkflowSuggestions(false)

      if (isLoading || queuedSubmissions.length > 0) {
        setQueuedSubmissions((current) => [...current, submission])
        showToast({
          title: '已加入队列',
          message: '当前有消息正在处理中，这条消息会按顺序提交给 AI。',
          variant: 'info',
        })
        return
      }

      setIsLoading(true)
      void processSubmission(submission, true)
    } catch (error) {
      showToast({
        title: '提交失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    }
  }

  const handleRemoveQueuedSubmission = (submissionId: string) => {
    setQueuedSubmissions((current) => current.filter((item) => item.id !== submissionId))
    showToast({
      title: '已取消排队',
      message: '这条消息不会再提交给 AI。',
      variant: 'success',
    })
  }

  const handleForwardToInput = (content: string) => {
    setInputMessage(content)
  }

  const registerReferencedNews = (article: NewsArticle) => {
    setReferencedNewsMap((current) => ({ ...current, [article.id]: article }))
  }

  const decodeBase64Url = (value: string) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }

  const parseNewsAction = (rawAction: string): { type: 'save-news' | 'quote-news'; article: NewsArticle } | null => {
    const match = rawAction.match(/^(save-news|quote-news):(.+)$/)
    if (!match) {
      return null
    }

    try {
      const [, type, payload] = match
      const article = JSON.parse(decodeBase64Url(payload)) as NewsArticle
      return {
        type: type as 'save-news' | 'quote-news',
        article,
      }
    } catch (error) {
      console.error('解析新闻操作失败:', error)
      return null
    }
  }

  const handleMarkdownAction = async (rawAction: string) => {
    const parsed = parseNewsAction(rawAction)
    if (!parsed) {
      showToast({
        title: '操作失败',
        message: '无法识别这条新闻操作。',
        variant: 'error',
      })
      return
    }

    const { type, article } = parsed
    registerReferencedNews(article)

    if (type === 'quote-news') {
      setQuotedNews(article)
      setInputMessage((current) => current || '请基于这条新闻生成摘要 / 成稿 / 改写版本')
      showToast({
        title: '已引用新闻',
        message: '这条新闻会作为当前对话上下文继续使用。',
        variant: 'success',
      })
      return
    }

    try {
      setIsSavingToDraft(true)
      const data = await createSavedNews({
        userId: '1',
        title: article.title,
        content: article.content,
        originalNewsId: article.id,
        originalNewsUrl: article.url,
        industries: article.relatedIndustries,
        outputType: 'news',
      })
      setSavedNews([data.data as SavedNews, ...savedNews])
      showToast({
        title: '保存成功',
        message: '新闻已保存到任务结果中的新闻草稿。',
        variant: 'success',
      })
    } catch (error) {
      showToast({
        title: '保存失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSavingToDraft(false)
    }
  }

  const handleSwitchModel = async (model: AIModelConfig) => {
    if (!configSnapshot || model.isActive || isSwitchingModel) {
      setShowModelMenu(false)
      return
    }

    try {
      setIsSwitchingModel(true)
      const updatedConfig = await switchAIModel({
        userId: '1',
        modelId: model.id,
      })
      setConfigSnapshot(updatedConfig)
      setShowModelMenu(false)
      showToast({
        title: '模型已切换',
        message: `当前使用模型已切换为 ${model.name || model.modelName}`,
        variant: 'success',
      })
      await refreshConfigState()
    } catch (error) {
      showToast({
        title: '切换失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSwitchingModel(false)
    }
  }

  const handleChangeWorkspace = async () => {
    if (!configSnapshot || isUpdatingWorkspace) {
      return
    }

    const nextRootPath = window.prompt('请输入新的工程文件夹路径', configSnapshot.workspace.rootPath || '~/Documents/AI助手工作台')
    if (!nextRootPath || nextRootPath.trim() === configSnapshot.workspace.rootPath) {
      return
    }

    try {
      setIsUpdatingWorkspace(true)
      const updatedConfig = await updateConfig({
        userId: '1',
        aiModel: configSnapshot.aiModel,
        aiModels: configSnapshot.aiModels,
        publishPlatforms: configSnapshot.publishPlatforms,
        workspace: {
          ...configSnapshot.workspace,
          rootPath: nextRootPath.trim(),
        },
      })
      setConfigSnapshot(updatedConfig)
      showToast({
        title: '目录已更新',
        message: '工程文件夹已切换，新文件会写入新的工作目录。',
        variant: 'success',
      })
      await refreshConfigState()
    } catch (error) {
      showToast({
        title: '目录切换失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsUpdatingWorkspace(false)
    }
  }

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('读取文件失败'))
          return
        }

        const [, contentBase64 = ''] = result.split(',')
        resolve(contentBase64)
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsDataURL(file)
    })

  const handleUploadAsset = async (file: File | null) => {
    if (!file) {
      return
    }

    try {
      setIsUploadingAsset(true)
      const contentBase64 = await readFileAsBase64(file)
      const result = await uploadWorkspaceAsset({
        userId: '1',
        fileName: file.name,
        contentBase64,
        mimeType: file.type || 'application/octet-stream',
      })

      setUploadedAssets((current) => [
        result.data,
        ...current.filter((item) => item.relativePath !== result.data.relativePath),
      ].slice(0, 4))
      setInputMessage((current) => current || `已上传文件：${result.data.fileName}，请基于该文件继续处理。`)
      setShowActionMenu(false)
      showToast({
        title: '上传成功',
        message: `${result.data.fileName} 已写入工程文件夹 uploads 目录。`,
        variant: 'success',
      })
    } catch (error) {
      showToast({
        title: '上传失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsUploadingAsset(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  const handleOpenSaveDialog = (content: string) => {
    setPendingSaveContent(content)
    setSaveTargetType('news')
    setSaveFileFormat('md')
  }

  const handleConfirmSave = async () => {
    if (!pendingSaveContent) {
      return
    }

    setIsSavingToDraft(true)
    try {
      const data = await createSavedNews({
        userId: '1',
        content: pendingSaveContent,
        categories: [],
        industries: [],
        outputType: saveTargetType,
        fileFormat: saveTargetType === 'file' ? saveFileFormat : undefined,
      })

      setSavedNews([data.data as SavedNews, ...savedNews])
      showToast({
        title: '保存成功',
        message:
          saveTargetType === 'file'
            ? '内容已保存为文件，并写入工作目录 generated'
            : '内容已保存为新闻，可继续发布',
        variant: 'success',
      })
      setPendingSaveContent(null)
    } catch (error) {
      showToast({
        title: '保存失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSavingToDraft(false)
    }
  }

  if (isCheckingConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="surface-panel-soft flex max-w-md flex-col items-center px-8 py-10">
          <div className="mb-5 h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
          <p className="text-lg font-medium text-slate-900">正在加载</p>
          <p className="mt-2 text-sm text-editorial-muted">请稍候</p>
        </div>
      </div>
    )
  }

  if (!hasAiModelConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12">
        <div className="surface-panel w-full max-w-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 shadow-[0_16px_36px_rgba(37,99,235,0.08)]">
            <Server className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-semibold text-slate-900">先配置 AI 模型</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-editorial-muted">
            完成后即可开始对话。
          </p>
          <div className="mx-auto mt-8 grid w-full max-w-xl gap-4 text-left md:grid-cols-2">
            <div className={`rounded-2xl border px-4 py-4 ${modelCheckDetails.primaryReady ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">主模型检测</p>
              <p className="mt-2 font-medium text-slate-900">{modelCheckDetails.primaryLabel}</p>
              <p className={`mt-2 text-sm ${modelCheckDetails.primaryReady ? 'text-emerald-700' : 'text-slate-600'}`}>
                {modelCheckDetails.primaryReady ? '已满足聊天调用条件' : '当前主模型信息还不完整'}
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-4 ${modelCheckDetails.fallbackReady ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">候选模型检测</p>
              <p className="mt-2 font-medium text-slate-900">{modelCheckDetails.fallbackLabel}</p>
              <p className={`mt-2 text-sm ${modelCheckDetails.fallbackReady ? 'text-emerald-700' : 'text-slate-600'}`}>
                {modelCheckDetails.fallbackReady ? '可作为当前可用模型回退' : '还没有检测到可用候选模型'}
              </p>
            </div>
          </div>
          {modelCheckDetails.lastError && (
            <div className="mx-auto mt-5 w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left">
              <p className="text-sm font-medium text-amber-900">检测提示</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">{modelCheckDetails.lastError}</p>
            </div>
          )}
          <div className="mx-auto mt-8 w-full max-w-md space-y-4">
            <Link
              to="/config"
              className="focus-ring flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-editorial-violet to-editorial-cyan px-6 py-3.5 text-white transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Settings className="h-5 w-5" />
              前往配置页面
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="focus-ring flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3.5 text-slate-700 transition-colors hover:bg-slate-100"
            >
              重新检测模型状态
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      <section className="flex min-h-0 flex-1 flex-col bg-transparent">
        <div className="flex-1 overflow-y-auto px-2 py-6">
          {!hasConversationStarted ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-4xl rounded-[32px] border border-slate-200 bg-white px-10 py-12 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-blue-600">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-center text-3xl font-semibold text-slate-900">开始任务</h2>
                <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-6 text-editorial-muted">
                  输入问题，或直接调用工作流。
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {workflows.slice(0, 6).map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => handleSelectWorkflow(workflow, true)}
                      className="focus-ring inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Workflow className="h-4 w-4" />
                      {workflow.invocation.primary}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-thread-shell w-full space-y-6" style={{ contentVisibility: 'auto' }}>
              {conversationMessages.map((message) => (
                <ConversationItem
                  key={message.id}
                  message={message}
                  referencedNews={message.referencedNewsId ? referencedNewsMap[message.referencedNewsId] || null : null}
                  onSaveContent={message.role === 'assistant' ? handleOpenSaveDialog : undefined}
                  onForwardToInput={handleForwardToInput}
                  onMarkdownAction={handleMarkdownAction}
                  isSaving={isSavingToDraft}
                />
              ))}
              {queuedSubmissions.map((submission) => (
                <ConversationItem
                  key={submission.id}
                  message={{
                    id: submission.id,
                    role: 'user',
                    content: submission.rawMessage,
                    referencedNewsId: submission.referencedNews?.id,
                    workflowId: submission.workflow?.id,
                    workflowInvocation: submission.workflow?.invocation.primary,
                    messageType: submission.workflow ? 'workflow' : 'plain',
                    timestamp: submission.createdAt,
                  }}
                  referencedNews={submission.referencedNews || null}
                  queueStatus="queued"
                  onRemoveQueued={() => handleRemoveQueuedSubmission(submission.id)}
                />
              ))}
              {isLoading && (
                <div className="mb-6 flex flex-col items-start" aria-live="polite" aria-label="AI 正在回答">
                  <div className="mb-1 flex w-full justify-start">
                    <div className="ai-thinking-orb flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-editorial-violet via-editorial-indigo to-editorial-cyan shadow-[0_14px_30px_rgba(37,99,235,0.18)]">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="max-w-[80%]">
                    <div className="ai-thinking-card rounded-[24px] rounded-tl-md border border-blue-100 bg-white px-5 py-4 text-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="ai-thinking-dot h-2.5 w-2.5 rounded-full bg-blue-500" style={{ animationDelay: '0ms' }} />
                          <div className="ai-thinking-dot h-2.5 w-2.5 rounded-full bg-cyan-500" style={{ animationDelay: '180ms' }} />
                          <div className="ai-thinking-dot h-2.5 w-2.5 rounded-full bg-indigo-500" style={{ animationDelay: '360ms' }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">AI 正在努力回答</p>
                          <p className="mt-0.5 text-sm text-editorial-muted">{thinkingMessages[thinkingStep]}</p>
                        </div>
                      </div>
                      <div className="ai-thinking-progress mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="ai-thinking-progress-bar h-full w-1/3 rounded-full bg-gradient-to-r from-editorial-violet via-blue-500 to-editorial-cyan" />
                      </div>
                      <p className="mt-3 text-sm text-editorial-muted">
                        {queuedSubmissions.length > 0
                          ? `当前排队 ${queuedSubmissions.length} 条，AI 会按顺序处理`
                          : selectedWorkflow
                            ? `当前工作流：${selectedWorkflow.displayName}`
                            : '普通对话模式'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-5">
          <div className="chat-thread-shell">
            <div className="relative rounded-[28px] border border-slate-200 bg-white px-4 pb-3 pt-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              {(selectedWorkflow || quotedNews || uploadedAssets.length > 0) && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {selectedWorkflow && (
                    <button
                      onClick={() => setSelectedWorkflow(null)}
                      className="focus-ring rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      {selectedWorkflow.displayName}
                    </button>
                  )}
                  {quotedNews && (
                    <button
                      onClick={() => setQuotedNews(null)}
                      className="focus-ring max-w-[340px] truncate rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
                    >
                      引用：{quotedNews.title}
                    </button>
                  )}
                  {uploadedAssets.map((asset) => (
                    <div
                      key={asset.relativePath}
                      className="max-w-[260px] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      {asset.fileName}
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => {
                    const nextValue = e.target.value
                    setInputMessage(nextValue)
                    setShowWorkflowSuggestions(nextValue.startsWith('/'))
                  }}
                  onFocus={() => {
                    if (inputMessage.startsWith('/')) {
                      setShowWorkflowSuggestions(true)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSendMessage()
                    } else if (e.key === 'Escape') {
                      setInputMessage('')
                      setShowWorkflowSuggestions(false)
                    }
                  }}
                  rows={2}
                  placeholder={
                    selectedWorkflow
                      ? `继续在 ${selectedWorkflow.displayName} 下输入任务...`
                      : '输入内容，或用 /工作流名称 调用工作流...'
                  }
                  className="focus-ring min-h-[58px] w-full resize-none border-0 bg-transparent px-1 py-0.5 text-[15px] leading-7 text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />

                {showWorkflowSuggestions && filteredWorkflows.length > 0 && (
                  <div className="absolute bottom-[calc(100%+14px)] left-0 z-20 w-full rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
                    <div className="space-y-1.5">
                      {filteredWorkflows.map((workflow) => (
                        <button
                          key={workflow.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectWorkflow(workflow, true)}
                          className="focus-ring flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{workflow.displayName}</p>
                            <p className="truncate text-xs text-slate-500">{workflow.description}</p>
                          </div>
                          <span className="ml-3 shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                            {workflow.invocation.primary}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative" ref={plusMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowActionMenu((current) => !current)}
                      className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
                      aria-label="更多操作"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                    {showActionMenu && (
                      <div className="absolute bottom-[calc(100%+12px)] left-0 z-20 w-72 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                        <div className="space-y-1">
                          {workflows.slice(0, 4).map((workflow) => (
                            <button
                              key={workflow.id}
                              type="button"
                              onClick={() => {
                                handleSelectWorkflow(workflow, true)
                                setShowActionMenu(false)
                              }}
                              className="focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                            >
                              <Workflow className="h-4 w-4 text-slate-500" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">{workflow.displayName}</p>
                                <p className="truncate text-xs text-slate-500">{workflow.invocation.primary}</p>
                              </div>
                            </button>
                          ))}
                          <div className="my-2 border-t border-slate-100" />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                          >
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-900">上传文件</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                          >
                            <FileImage className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-900">上传图片</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleChangeWorkspace()}
                    className="focus-ring inline-flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span className="max-w-[180px] truncate">
                      {isUpdatingWorkspace ? '切换目录中...' : currentWorkspaceLabel}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative" ref={modelMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowModelMenu((current) => !current)}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span className="max-w-[160px] truncate">{isSwitchingModel ? '切换模型中...' : currentModelLabel}</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    {showModelMenu && configuredAiModels.length > 0 && (
                      <div className="absolute bottom-[calc(100%+12px)] right-0 z-20 w-72 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                        <div className="space-y-1">
                          {configuredAiModels.map((model) => {
                            const isCurrent = model.isActive
                            return (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => void handleSwitchModel(model)}
                                disabled={isCurrent || isSwitchingModel}
                                className="focus-ring flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-70"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-900">{model.name || model.modelName}</p>
                                  <p className="truncate text-xs text-slate-500">{model.modelName || model.baseUrl || model.provider}</p>
                                </div>
                                <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs ${isCurrent ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                  {isCurrent ? '当前' : '切换'}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => void handleSendMessage()}
                    disabled={!inputMessage.trim()}
                    className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                    aria-label="发送消息"
                  >
                    <Send className={`h-4.5 w-4.5 ${(isLoading || queuedSubmissions.length > 0) ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => void handleUploadAsset(event.target.files?.[0] || null)}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleUploadAsset(event.target.files?.[0] || null)}
            />
            {isUploadingAsset && (
              <p className="mt-3 text-sm text-editorial-muted">正在上传文件到工程目录...</p>
            )}
          </div>
        </div>
      </section>

      {pendingSaveContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">选择保存格式</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  你可以将这段内容保存为可发布的新闻，或保存为可下载文件。
                </p>
              </div>
              <button
                onClick={() => setPendingSaveContent(null)}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
              >
                关闭
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                onClick={() => setSaveTargetType('news')}
                className={`rounded-[24px] border px-5 py-5 text-left transition ${
                  saveTargetType === 'news'
                    ? 'border-blue-200 bg-blue-50 shadow-[0_14px_36px_rgba(37,99,235,0.08)]'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                  <Newspaper className="h-5 w-5" />
                </div>
                <p className="mt-4 font-medium text-slate-900">保存为新闻</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  内容会进入任务结果中的新闻条目，后续可继续编辑和发布。
                </p>
              </button>

              <button
                onClick={() => setSaveTargetType('file')}
                className={`rounded-[24px] border px-5 py-5 text-left transition ${
                  saveTargetType === 'file'
                    ? 'border-blue-200 bg-blue-50 shadow-[0_14px_36px_rgba(37,99,235,0.08)]'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="mt-4 font-medium text-slate-900">保存为文件</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  内容会写入系统默认或已配置的工作目录，可在任务结果中直接下载。
                </p>
              </button>
            </div>

            {saveTargetType === 'file' && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-700">文件格式</label>
                <select
                  value={saveFileFormat}
                  onChange={(e) => setSaveFileFormat(e.target.value as 'md' | 'txt' | 'json' | 'html')}
                  className="focus-ring mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700"
                >
                  <option value="md">Markdown (.md)</option>
                  <option value="txt">文本文件 (.txt)</option>
                  <option value="json">JSON (.json)</option>
                  <option value="html">HTML (.html)</option>
                </select>
              </div>
            )}

            <div className="mt-7 flex gap-3">
              <button
                onClick={() => setPendingSaveContent(null)}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                取消
              </button>
              <button
                onClick={() => void handleConfirmSave()}
                disabled={isSavingToDraft}
                className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {isSavingToDraft ? '保存中...' : saveTargetType === 'file' ? '保存为文件' : '保存为新闻'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
