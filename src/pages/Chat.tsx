import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, ChevronDown, FileImage, FileText, FolderOpen, Newspaper, Plus, Send, Workflow } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { getConfig, importWorkspaceFolder, openWorkspaceFolder, switchAIModel, updateConfig, uploadWorkspaceAsset } from '@/lib/api/config'
import { executeWorkflow, parseWorkflowCommand, getWorkflowExecutions, getWorkflows } from '@/lib/api/workflows'
import { buildNewsAssistantDraftTask, findNewsAssistantWorkflow } from '@/lib/utils/newsAssistant'
import { canUseWorkflow, getVisibleWorkflows } from '@/lib/utils/workflowAccess'

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

function toWorkspaceRelativePath(rootPath: string, targetPath: string) {
  const normalize = (value: string) => value.replace(/\\/g, '/').replace(/\/+$/, '')
  const normalizedRoot = normalize(rootPath)
  const normalizedTarget = normalize(targetPath)

  if (!normalizedRoot || !normalizedTarget.startsWith(`${normalizedRoot}/`)) {
    return 'uploads/generated'
  }

  return normalizedTarget.slice(normalizedRoot.length + 1)
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
    uploadedAssetPaths?: string[]
    uploadedFolderName?: string
    uploadedFileNames?: string[]
    referencedNews?: NewsArticle | null
    requestMode?: 'chat' | 'workflow'
    autoSaveGeneratedNews?: boolean
    createdAt: string
  }

  type UploadedAsset = {
    fileName: string
    relativePath: string
    mimeType: string
    originalFileName?: string
  }

  type ImportedFolderSelection = {
    folderName: string
    folderPath: string
    assets: UploadedAsset[]
  }

  const location = useLocation()
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const [inputMessage, setInputMessage] = useState('')
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
  const [taxFolderSelection, setTaxFolderSelection] = useState<ImportedFolderSelection | null>(null)
  const [isSelectingTaxFolder, setIsSelectingTaxFolder] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const conversationMessagesRef = useRef<ConversationMessage[]>([])
  const conversationHistoriesRef = useRef<ConversationHistory[]>([])
  const currentConversationIdRef = useRef<string | null>(null)
  const conversationIdRef = useRef<string | undefined>(conversationId)
  const pendingTaxSubmissionRef = useRef<{
    rawMessage: string
    requestMessage: string
    workflow: WorkflowDefinition
    createdAt: string
  } | null>(null)
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

  const messageList = Array.isArray(conversationMessages) ? conversationMessages : []
  const historyList = Array.isArray(conversationHistories) ? conversationHistories : []
  const workflowList = Array.isArray(workflows) ? workflows : []
  const assetList = Array.isArray(uploadedAssets) ? uploadedAssets : []
  const queuedSubmissionList = Array.isArray(queuedSubmissions) ? queuedSubmissions : []

  const configuredAiModels = useMemo(
    () => (configSnapshot?.aiModels || []).filter((model) => isModelReady(model)),
    [configSnapshot]
  )
  const configuredModelList = Array.isArray(configuredAiModels) ? configuredAiModels : []

  const currentWorkspacePath = configSnapshot?.workspace?.rootPath || ''
  const currentWorkspaceLabel = getPathLeafLabel(currentWorkspacePath)
  const localWorkflowOnly = Boolean(configSnapshot?.workspace?.localWorkflowOnly)
  const canUseAiChat = Boolean(activeAiModel) && !localWorkflowOnly
  const isTaxReportWorkflow = selectedWorkflow?.id === 'workflow-tax-report'
  const folderInputAttributes = {
    webkitdirectory: '',
    directory: '',
  } as Record<string, string>
  const currentModelLabel =
    activeAiModel?.effectiveModelName ||
    activeAiModel?.configuredModelName ||
    activeAiModel?.configuredName ||
    '未设置模型'

  useEffect(() => {
    conversationMessagesRef.current = messageList
  }, [messageList])

  useEffect(() => {
    conversationHistoriesRef.current = historyList
  }, [historyList])

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId
  }, [currentConversationId])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messageList, isLoading])

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
        messageList.length > 0 ||
        selectedWorkflow !== null
      ) {
        startNewConversation()
      }
      return
    }

    if (!conversationId) {
      return
    }

    const history = historyList.find((item) => item.id === conversationId)
    if (!history || currentConversationId === history.id) {
      return
    }

    setCurrentConversationId(history.id)
    loadConversationMessages(history.messages)
  }, [
    currentConversationId,
    historyList,
    conversationId,
    messageList,
    loadConversationMessages,
    selectedWorkflow,
    setCurrentConversationId,
    startNewConversation,
  ])

  const refreshConfigState = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsCheckingConfig(true)
      }

      const config = await getConfig('1')
      setConfigSnapshot(config)

      setActiveAiModel(
        buildActiveModelInfo({
          aiModel: config.aiModel,
          aiModels: config.aiModels || [],
        })
      )
    } catch (_error) {
      setConfigSnapshot(null)
      setActiveAiModel(null)
    } finally {
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
        setWorkflows(Array.isArray(workflowResponse.data) ? workflowResponse.data : [])
        setWorkflowExecutions(Array.isArray(executionResponse.data) ? executionResponse.data : [])
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

  const visibleWorkflows = useMemo(() => {
    return getVisibleWorkflows(workflowList as WorkflowDefinition[], {
      hasAiModel: Boolean(activeAiModel),
      localWorkflowOnly,
    })
  }, [activeAiModel, localWorkflowOnly, workflowList])

  useEffect(() => {
    if (!selectedWorkflow) {
      return
    }

    if (!canUseWorkflow(selectedWorkflow, { hasAiModel: Boolean(activeAiModel), localWorkflowOnly })) {
      setSelectedWorkflow(null)
    }
  }, [activeAiModel, localWorkflowOnly, selectedWorkflow, setSelectedWorkflow])

  const filteredWorkflows = useMemo(() => {
    const token = currentCommandToken.replace(/^\/\+?/, '').toLowerCase()
    if (!token) {
      return visibleWorkflows.slice(0, 8)
    }

    return visibleWorkflows.filter((workflow) => {
      const candidates = [
        workflow.name,
        workflow.displayName,
        workflow.invocation.primary,
        ...workflow.invocation.aliases,
      ]
      return candidates.some((item) => item.toLowerCase().includes(token))
    })
  }, [currentCommandToken, visibleWorkflows])

  const hasConversationStarted = messageList.length > 0 || queuedSubmissionList.length > 0 || isLoading

  const submitQueuedSubmission = (submission: QueuedSubmission) => {
    if (isLoading || queuedSubmissionList.length > 0) {
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
  }

  const beginTaxReportSelection = async (workflow: WorkflowDefinition): Promise<ImportedFolderSelection | null> => {
    if (isSelectingTaxFolder) {
      return null
    }

    try {
      setIsSelectingTaxFolder(true)
      const folderPath =
        typeof window !== 'undefined' && window.electronAPI?.selectDirectory
          ? await window.electronAPI.selectDirectory()
          : null

      if (!folderPath && folderInputRef.current) {
        setSelectedWorkflow(workflow)
        setInputMessage(workflow.invocation.primary)
        setShowWorkflowSuggestions(false)
        setShowActionMenu(false)
        folderInputRef.current.click()
        return null
      }

      if (!folderPath) {
        setSelectedWorkflow(null)
        setTaxFolderSelection(null)
        setInputMessage('')
        setShowWorkflowSuggestions(false)
        pendingTaxSubmissionRef.current = null
        return null
      }

      setIsUploadingAsset(true)
      const imported = await importWorkspaceFolder({
        userId: '1',
        folderPath,
      })

      const selection: ImportedFolderSelection = {
        folderName: imported.data.folderName,
        folderPath: imported.data.folderPath,
        assets: imported.data.assets.map((item) => ({
          fileName: item.fileName,
          relativePath: item.relativePath,
          mimeType: item.mimeType,
          originalFileName: item.originalFileName,
        })),
      }

      setSelectedWorkflow(workflow)
      setTaxFolderSelection(selection)
      setInputMessage(workflow.invocation.primary)
      setShowWorkflowSuggestions(false)
      setShowActionMenu(false)
      showToast({
        title: '文件夹已载入',
        message: `已导入 ${selection.folderName}，共 ${selection.assets.length} 个 Excel 文件。`,
        variant: 'success',
      })
      return selection
    } catch (error) {
      setSelectedWorkflow(null)
      setTaxFolderSelection(null)
      setInputMessage('')
      pendingTaxSubmissionRef.current = null
      showToast({
        title: '文件夹导入失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
      return null
    } finally {
      setIsUploadingAsset(false)
      setIsSelectingTaxFolder(false)
    }
  }

  const handleSelectWorkflow = (workflow: WorkflowDefinition, insertCommand = false) => {
    if (workflow.id === 'workflow-tax-report') {
      void beginTaxReportSelection(workflow)
      return
    }

    setSelectedWorkflow(workflow)
    setShowWorkflowSuggestions(false)
    if (insertCommand) {
      setInputMessage((current) => {
        const withoutCommand = current.replace(/^(\/\+?[^\s]*)\s*/, '')
        return `${workflow.invocation.primary}${withoutCommand ? ` ${withoutCommand}` : ' '}`
      })
    }
  }

  const ensureNewsAssistantWorkflow = async () => {
    const existingWorkflow = findNewsAssistantWorkflow(workflows)
    if (existingWorkflow) {
      return existingWorkflow
    }

    const response = await getWorkflows()
    setWorkflows(response.data)
    return findNewsAssistantWorkflow(response.data)
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
        uploadedFolderName: submission.uploadedFolderName,
        uploadedFileNames: submission.uploadedFileNames,
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

      const history = currentMessages.slice(-12).map((msg) => ({
        role: msg.role,
        content: clampChatText(msg.content, 800),
      }))

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

      const data =
        submission.requestMode === 'workflow' && submission.workflow
          ? canUseWorkflow(submission.workflow, {
              hasAiModel: Boolean(activeAiModel),
              localWorkflowOnly,
            })
            ? await executeWorkflow({
                workflowId: submission.workflow.id,
                invocation: submission.workflow.invocation.primary,
                userId: '1',
                message: submission.requestMessage,
                uploadedAssetPaths: submission.uploadedAssetPaths,
                referencedNewsId: submission.referencedNews?.id,
                history,
              })
            : (() => {
                throw new Error('当前未配置可用 AI 模型，该工作流暂不可用')
              })()
          : await chatWithAi({
              userId: '1',
              message: referencedPrompt ? `${referencedPrompt}\n\n用户任务：${submission.requestMessage}` : submission.requestMessage,
              history,
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

      if (submission.autoSaveGeneratedNews && data.content.trim()) {
        try {
          const savedDraft = await createSavedNews({
            userId: '1',
            content: data.content,
            originalNewsId: submission.referencedNews?.id,
            originalNewsUrl: submission.referencedNews?.url,
            industries: submission.referencedNews?.relatedIndustries || [],
            outputType: 'news',
          })
          const latestSavedNews = useAppStore.getState().savedNews
          const createdDraft = savedDraft.data as SavedNews
          setSavedNews([createdDraft, ...latestSavedNews])
          showToast({
            title: '新闻草稿已生成',
            message: '新闻助手已完成成稿，并自动保存到任务结果。',
            variant: 'success',
          })
          navigate(`/news?highlight=${encodeURIComponent(createdDraft.id)}`)
        } catch (error) {
          showToast({
            title: '自动保存失败',
            message: getErrorMessage(error, '新闻内容已生成，但保存到任务结果时失败。'),
            variant: 'error',
          })
        }
      }

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
    if (isLoading || queuedSubmissionList.length === 0) {
      return
    }

    const [nextSubmission, ...restSubmissions] = queuedSubmissionList
    setIsLoading(true)
    setQueuedSubmissions(restSubmissions)
    void processSubmission(nextSubmission, true)
  }, [isLoading, queuedSubmissionList])

  const handleSendMessage = async () => {
    const rawMessage = inputMessage.trim()
    if (!rawMessage) return

    try {
      let activeWorkflow = selectedWorkflow
      let requestMessage = rawMessage
      let currentTaxSelection = taxFolderSelection

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
        if (!canUseWorkflow(parsed.workflow, { hasAiModel: Boolean(activeAiModel), localWorkflowOnly })) {
          showToast({
            title: '工作流不可用',
            message: '当前仅支持本地工作流，请选择 /个税报表。',
            variant: 'error',
          })
          return
        }
        activeWorkflow = parsed.workflow
        requestMessage = parsed.remainingInput || rawMessage
        setSelectedWorkflow(parsed.workflow)
      } else if (activeWorkflow) {
        requestMessage = `${activeWorkflow.invocation.primary} ${rawMessage}`
      }

      if (!activeWorkflow && !canUseAiChat) {
        const currentMessages = conversationMessagesRef.current
        const currentHistories = conversationHistoriesRef.current
        const currentHistoryId = currentConversationIdRef.current
        const now = new Date().toISOString()
        const historyId = currentHistoryId || Date.now().toString()
        const firstMessage = currentMessages.find((msg) => msg.role === 'user') || null
        const userMessage: ConversationMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: rawMessage,
          timestamp: now,
        }
        const systemMessage: ConversationMessage = {
          id: `${Date.now() + 1}`,
          role: 'assistant',
          content:
            '当前未配置 AI 模型，无法使用 AI 进行沟通，请前往【设置】中的【系统配置】配置 AI 模型。',
          messageType: 'system',
          timestamp: now,
        }
        const updatedMessages = [...currentMessages, userMessage, systemMessage]
        const existingHistory = currentHistoryId
          ? currentHistories.find((item) => item.id === currentHistoryId)
          : null

        addConversationMessage(userMessage)
        addConversationMessage(systemMessage)
        upsertConversationHistory({
          id: historyId,
          title: firstMessage?.content.substring(0, 50) || rawMessage.substring(0, 50) || '未命名任务',
          messages: updatedMessages,
          createdAt: existingHistory?.createdAt || now,
          updatedAt: now,
        })

        if (conversationIdRef.current !== historyId) {
          navigate(`/chat/${historyId}`, { replace: true })
        }

        setInputMessage('')
        setShowWorkflowSuggestions(false)
        setTaxFolderSelection(null)
        pendingTaxSubmissionRef.current = null
        return
      }

      if (activeWorkflow?.id === 'workflow-tax-report' && !taxFolderSelection) {
        pendingTaxSubmissionRef.current = {
          rawMessage,
          requestMessage,
          workflow: activeWorkflow,
          createdAt: new Date().toISOString(),
        }
        const selection = await beginTaxReportSelection(activeWorkflow)
        if (!selection) {
          return
        }
        currentTaxSelection = selection
      }

      const taxSelection = activeWorkflow?.id === 'workflow-tax-report' ? currentTaxSelection || undefined : undefined
      const submission: QueuedSubmission = {
        id: Date.now().toString(),
        rawMessage,
        requestMessage,
        workflow: activeWorkflow,
        uploadedAssetPaths:
          activeWorkflow?.id === 'workflow-tax-report'
            ? taxSelection?.assets.map((item) => item.relativePath)
            : assetList.map((item) => item.relativePath),
        uploadedFolderName: activeWorkflow?.id === 'workflow-tax-report' ? taxSelection?.folderName : undefined,
        uploadedFileNames:
          activeWorkflow?.id === 'workflow-tax-report'
            ? taxSelection?.assets.map((item) => item.originalFileName || item.fileName)
            : undefined,
        referencedNews: quotedNews,
        requestMode: activeWorkflow ? 'workflow' : 'chat',
        createdAt: new Date().toISOString(),
      }

      setInputMessage('')
      setShowWorkflowSuggestions(false)
      setTaxFolderSelection(null)
      pendingTaxSubmissionRef.current = null
      if (activeWorkflow?.id !== 'workflow-tax-report') {
        setUploadedAssets([])
      }

      submitQueuedSubmission(submission)
    } catch (error) {
      pendingTaxSubmissionRef.current = null
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

  const parseFolderAction = (rawAction: string): { type: 'open-output-folder'; targetPath: string } | null => {
    const match = rawAction.match(/^(open-output-folder):(.+)$/)
    if (!match) {
      return null
    }

    try {
      const [, type, payload] = match
      return {
        type: type as 'open-output-folder',
        targetPath: decodeBase64Url(payload),
      }
    } catch (error) {
      console.error('解析文件夹操作失败:', error)
      return null
    }
  }

  const handleMarkdownAction = async (rawAction: string) => {
    const folderAction = parseFolderAction(rawAction)
    if (folderAction) {
      try {
        const relativePath = currentWorkspacePath && folderAction.targetPath.startsWith(currentWorkspacePath)
          ? toWorkspaceRelativePath(currentWorkspacePath, folderAction.targetPath)
          : 'uploads/generated'

        const openedByElectron = window.electronAPI?.openPath
          ? await window.electronAPI.openPath(folderAction.targetPath)
          : false

        if (!openedByElectron) {
          await openWorkspaceFolder({
            userId: '1',
            relativePath,
          })
        }
      } catch (error) {
        showToast({
          title: '打开失败',
          message: getErrorMessage(error, '无法打开 output 文件夹。'),
          variant: 'error',
        })
      }
      return
    }

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
      try {
        const workflow = await ensureNewsAssistantWorkflow()
        if (!workflow) {
          throw new Error('未找到新闻助手工作流')
        }

        setSelectedWorkflow(workflow)

        const submission: QueuedSubmission = {
          id: Date.now().toString(),
          rawMessage: `引用推荐新闻并生成新稿：${article.title}`,
          requestMessage: buildNewsAssistantDraftTask(article),
          workflow,
          referencedNews: article,
          requestMode: 'workflow',
          autoSaveGeneratedNews: true,
          createdAt: new Date().toISOString(),
        }

        if (isLoading || queuedSubmissionList.length > 0) {
          setQueuedSubmissions((current) => [...current, submission])
          showToast({
            title: '已加入队列',
            message: '将按顺序启动新闻助手生成并自动保存新稿。',
            variant: 'info',
          })
          return
        }

        setIsLoading(true)
        showToast({
          title: '新闻助手已启动',
          message: '正在基于引用新闻撰写新稿，完成后会自动保存到任务结果。',
          variant: 'success',
        })
        void processSubmission(submission, true)
      } catch (error) {
        showToast({
          title: '启动失败',
          message: getErrorMessage(error, '暂时无法启动新闻助手。'),
          variant: 'error',
        })
      }
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

  const uploadWorkspaceFiles = async (files: File[]) => {
    if (files.length === 0) {
      return
    }

    try {
      setIsUploadingAsset(true)
      const uploadedResults: UploadedAsset[] = []

      for (const file of files) {
        const contentBase64 = await readFileAsBase64(file)
        const result = await uploadWorkspaceAsset({
          userId: '1',
          fileName: file.name,
          contentBase64,
          mimeType: file.type || 'application/octet-stream',
        })
        uploadedResults.push(result.data)
      }

      setUploadedAssets((current) => {
        const merged = [...uploadedResults, ...current]
        const deduped = new Map(merged.map((item) => [item.relativePath, item]))
        return Array.from(deduped.values())
      })
      setInputMessage((current) => current || `已上传文件：${uploadedResults[0]?.fileName || ''}，请基于该文件继续处理。`)
      setShowActionMenu(false)
      showToast({
        title: '上传成功',
        message: files.length > 1 ? `${files.length} 个文件已写入工程文件夹 uploads 目录。` : `${uploadedResults[0]?.fileName || '文件'} 已写入工程文件夹 uploads 目录。`,
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

  const handleUploadAsset = async (file: File | null) => {
    if (!file) {
      return
    }

    await uploadWorkspaceFiles([file])
  }

  const handleUploadFolderFallback = async (fileList: FileList | null) => {
    if (!fileList) {
      setSelectedWorkflow(null)
      setTaxFolderSelection(null)
      setInputMessage('')
      pendingTaxSubmissionRef.current = null
      return
    }

    const excelFiles = Array.from(fileList).filter((file) => /\.(xlsx|xls)$/i.test(file.name))
    const filteredExcelFiles = excelFiles.filter((file) => {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      return !/(^|\/)(output|generated)(\/|$)/i.test(relativePath.replace(/\\/g, '/'))
    })

    if (filteredExcelFiles.length === 0) {
      setSelectedWorkflow(null)
      setTaxFolderSelection(null)
      setInputMessage('')
      showToast({
        title: '未找到 Excel 文件',
        message: '所选文件夹中没有可用的 Excel 文件。',
        variant: 'error',
      })
      if (folderInputRef.current) {
        folderInputRef.current.value = ''
      }
      return
    }

    try {
      setIsUploadingAsset(true)
      const uploadedResults: UploadedAsset[] = []

      for (const file of filteredExcelFiles) {
        const contentBase64 = await readFileAsBase64(file)
        const result = await uploadWorkspaceAsset({
          userId: '1',
          fileName: file.name,
          contentBase64,
          mimeType: file.type || 'application/octet-stream',
        })
        uploadedResults.push({
          ...result.data,
          originalFileName: file.name,
        })
      }

      const folderName =
        ((filteredExcelFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '')
          .split('/')
          .filter(Boolean)[0] || '已选文件夹'

      setTaxFolderSelection({
        folderName,
        folderPath: folderName,
        assets: uploadedResults,
      })
      setInputMessage('/个税报表')
      setShowWorkflowSuggestions(false)
      setShowActionMenu(false)
      showToast({
        title: '文件夹已载入',
        message: `已导入 ${folderName}，共 ${uploadedResults.length} 个 Excel 文件。`,
        variant: 'success',
      })

      const pendingSubmission = pendingTaxSubmissionRef.current
      if (pendingSubmission) {
        pendingTaxSubmissionRef.current = null
        setTaxFolderSelection(null)
        setInputMessage('')

        submitQueuedSubmission({
          id: Date.now().toString(),
          rawMessage: pendingSubmission.rawMessage,
          requestMessage: pendingSubmission.requestMessage,
          workflow: pendingSubmission.workflow,
          uploadedAssetPaths: uploadedResults.map((item) => item.relativePath),
          uploadedFolderName: folderName,
          uploadedFileNames: uploadedResults.map((item) => item.originalFileName || item.fileName),
          requestMode: 'workflow',
          createdAt: pendingSubmission.createdAt,
        })
      }
    } catch (error) {
      setSelectedWorkflow(null)
      setTaxFolderSelection(null)
      setInputMessage('')
      pendingTaxSubmissionRef.current = null
      showToast({
        title: '文件夹导入失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsUploadingAsset(false)
      if (folderInputRef.current) {
        folderInputRef.current.value = ''
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
                  {visibleWorkflows.slice(0, 6).map((workflow) => (
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
              {messageList.map((message) => (
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
              {queuedSubmissionList.map((submission) => (
                <ConversationItem
                  key={submission.id}
                  message={{
                    id: submission.id,
                    role: 'user',
                    content: submission.rawMessage,
                    uploadedFolderName: submission.uploadedFolderName,
                    uploadedFileNames: submission.uploadedFileNames,
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
                        {queuedSubmissionList.length > 0
                          ? `当前排队 ${queuedSubmissionList.length} 条，AI 会按顺序处理`
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
              {(selectedWorkflow || quotedNews || (assetList.length > 0 && !isTaxReportWorkflow) || taxFolderSelection) && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {selectedWorkflow && (
                    <button
                      onClick={() => {
                        setSelectedWorkflow(null)
                        setTaxFolderSelection(null)
                        if (isTaxReportWorkflow) {
                          setInputMessage('')
                        }
                      }}
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
                  {!isTaxReportWorkflow && assetList.map((asset) => (
                    <div
                      key={asset.relativePath}
                      className="max-w-[260px] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      {asset.fileName}
                    </div>
                  ))}
                  {isTaxReportWorkflow && taxFolderSelection && (
                    <div className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                      已选择文件夹：{taxFolderSelection.folderName}，共 {taxFolderSelection.assets.length} 个 Excel 文件
                    </div>
                  )}
                </div>
              )}

              {!canUseAiChat && !selectedWorkflow && (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  当前未配置 AI 模型，无法使用 AI 进行沟通，请前往
                  <button
                    type="button"
                    onClick={() => navigate('/config')}
                    className="mx-1 font-medium text-amber-900 underline underline-offset-4 transition hover:text-amber-950"
                  >
                    设置 / 系统配置
                  </button>
                  完成 AI 模型配置，或直接使用 /个税报表 等本地工作流。
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
                    isTaxReportWorkflow
                      ? '已选择文件夹，点击发送后将直接生成个税申报表...'
                      : selectedWorkflow
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
                          {visibleWorkflows.slice(0, 4).map((workflow) => (
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
                            onClick={() => {
                              const taxWorkflow = visibleWorkflows.find((item) => item.id === 'workflow-tax-report')
                              if (taxWorkflow) {
                                void beginTaxReportSelection(taxWorkflow)
                              }
                            }}
                            className="focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                          >
                            <FolderOpen className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-900">上传文件夹</span>
                          </button>
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
                    {showModelMenu && configuredModelList.length > 0 && (
                      <div className="absolute bottom-[calc(100%+12px)] right-0 z-20 w-72 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                        <div className="space-y-1">
                          {configuredModelList.map((model) => {
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
                    <Send className={`h-4.5 w-4.5 ${(isLoading || queuedSubmissionList.length > 0) ? 'animate-pulse' : ''}`} />
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
            <input
              ref={folderInputRef}
              type="file"
              multiple
              {...folderInputAttributes}
              className="hidden"
              onChange={(event) => void handleUploadFolderFallback(event.target.files)}
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
