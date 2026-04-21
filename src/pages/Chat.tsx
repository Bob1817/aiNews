import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Command, Send, Server, Settings, Workflow } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ConversationItem } from '@/components/ConversationItem'
import { useToast } from '@/lib/toast'
import { useAppStore } from '@/store'
import type {
  ActiveAIModelInfo,
  ConversationHistory,
  ConversationMessage,
  SavedNews,
  WorkflowDefinition,
} from '@/types'
import { chat as chatWithAi } from '@/lib/api/chat'
import { getErrorMessage } from '@/lib/errors'
import { createSavedNews } from '@/lib/api/news'
import { getActiveAIModel, getConfig } from '@/lib/api/config'
import { parseWorkflowCommand, getWorkflowExecutions, getWorkflows } from '@/lib/api/workflows'

const thinkingMessages = [
  '正在理解你的问题',
  '正在整理可用信息',
  '正在生成更清晰的回答',
] as const

function isModelReady(model?: {
  provider?: string
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

export function Chat() {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages, isLoading])

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

  useEffect(() => {
    const checkAiModelConfig = async () => {
      let hasValidConfig = false

      try {
        setIsCheckingConfig(true)
        const config = await getConfig('1')
        const activeModel = config.aiModels?.find((item) => item.isActive) || config.aiModels?.[0]
        const primaryReady = isModelReady(config.aiModel)
        const fallbackReady = isModelReady(activeModel)
        hasValidConfig = primaryReady || fallbackReady
        setHasAiModelConfig(hasValidConfig)
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
      }

      try {
        const activeModelInfo = await getActiveAIModel('1')
        setActiveAiModel(activeModelInfo)
        if (activeModelInfo.configured) {
          setHasAiModelConfig(true)
        }
      } catch (_error) {
        setActiveAiModel(null)
        setModelCheckDetails((current) => ({
          ...current,
          lastError: current.lastError || '当前无法解析实际生效模型，但不影响已保存配置的使用。',
        }))
        if (!hasValidConfig) {
          setHasAiModelConfig(false)
        }
      } finally {
        setIsCheckingConfig(false)
      }
    }

    checkAiModelConfig()
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

  const hasConversationStarted = conversationMessages.length > 0 || isLoading

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

      const userMessage: ConversationMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: rawMessage,
        workflowId: activeWorkflow?.id,
        workflowInvocation: activeWorkflow?.invocation.primary,
        messageType: activeWorkflow ? 'workflow' : 'plain',
        timestamp: new Date().toISOString(),
      }

      addConversationMessage(userMessage)
      setInputMessage('')
      setIsLoading(true)
      setShowWorkflowSuggestions(false)

      const existingHistory = currentConversationId
        ? conversationHistories.find((item) => item.id === currentConversationId)
        : null
      const now = new Date().toISOString()
      const historyId = existingHistory?.id || currentConversationId || `${Date.now()}`
      const messagesWithUser = [...conversationMessages, userMessage]
      const firstMessage = messagesWithUser.find((msg) => msg.role === 'user')

      const pendingHistory: ConversationHistory = {
        id: historyId,
        title: firstMessage?.content.substring(0, 50) || '未命名任务',
        messages: messagesWithUser,
        createdAt: existingHistory?.createdAt || now,
        updatedAt: now,
      }

      upsertConversationHistory(pendingHistory)

      if (conversationId !== historyId) {
        navigate(`/chat/${historyId}`, { replace: true })
      }

      const data = await chatWithAi({
        userId: '1',
        message: requestMessage,
        history: conversationMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
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
        workflowId: data.workflow?.id || activeWorkflow?.id,
        workflowInvocation: data.workflow?.invocation.primary || activeWorkflow?.invocation.primary,
        messageType: data.workflow ? 'result' : 'plain',
        executionId: data.execution?.id,
        artifacts: data.artifacts,
        timestamp: new Date().toISOString(),
      }
      addConversationMessage(aiMessage)

      const updatedMessages = [...conversationMessages, userMessage, aiMessage]
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

  const handleForwardToInput = (content: string) => {
    setInputMessage(content)
  }

  const handleSaveToDraft = async (content: string) => {
    setIsSavingToDraft(true)
    try {
      const lines = content.trim().split('\n')
      let title = 'AI 助手输出内容'
      let actualContent = content

      if (lines.length > 0) {
        const firstLine = lines[0].trim()
        if (firstLine.startsWith('#')) {
          title = firstLine.replace(/^#+\s*/, '').trim()
          actualContent = lines.slice(1).join('\n').trim()
        } else if (firstLine.length > 0 && firstLine.length <= 100) {
          title = firstLine
          actualContent = lines.slice(1).join('\n').trim()
          if (actualContent.length < 50) {
            title = 'AI 助手输出内容'
            actualContent = content
          }
        }
      }

      const data = await createSavedNews({
        userId: '1',
        title,
        content: actualContent || content,
        categories: [],
        industries: [],
      })

      setSavedNews([data.data as SavedNews, ...savedNews])
      showToast({
        title: '保存成功',
        message: '内容已保存到任务结果',
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

  if (isCheckingConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="surface-panel-soft flex max-w-lg flex-col items-center px-10 py-12">
          <div className="mb-5 h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
          <p className="text-lg font-medium text-slate-900">正在同步 AI 助手工作台</p>
          <p className="mt-2 text-sm text-editorial-muted">正在检查模型配置与工作流库，请稍候。</p>
        </div>
      </div>
    )
  }

  if (!hasAiModelConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12">
        <div className="surface-panel w-full max-w-2xl p-8 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-blue-50 shadow-[0_20px_50px_rgba(37,99,235,0.08)]">
            <Server className="h-12 w-12 text-blue-600" />
          </div>
          <span className="eyebrow mb-5">Setup Required</span>
          <h2 className="text-4xl font-semibold text-slate-900">先接入 AI 模型，再开始工作</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-editorial-muted">
            完成配置后，你就可以在聊天中直接通过 <code>/工作流名称</code> 调用具体能力，例如新闻推送、新闻助手等。
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
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!hasConversationStarted ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-4xl rounded-[32px] border border-slate-200 bg-white px-10 py-12 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-editorial-violet via-editorial-indigo to-editorial-cyan">
                  <Command className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-center text-4xl font-semibold text-slate-900">直接开始对话</h2>
                <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-editorial-muted">
                  右侧现在完全是聊天工作台。输入自然语言即可开始，也可以用 slash command 调用内置工作流，比如
                  <code> /新闻推送</code>、<code> /新闻助手</code>。
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
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-editorial-muted">Chat</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">普通对话适合临时问题、写作辅助和快速整理思路。</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-editorial-muted">Workflow</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">slash command 会让 AI 严格按工作流步骤和约束执行。</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-editorial-muted">News Push</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">新闻推送不再展示在首页，而是按需通过工作流拉取和返回简报。</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-thread-shell w-full space-y-6" style={{ contentVisibility: 'auto' }}>
              {conversationMessages.map((message) => (
                <ConversationItem
                  key={message.id}
                  message={message}
                  onSaveToDraft={message.role === 'assistant' ? handleSaveToDraft : undefined}
                  onForwardToInput={handleForwardToInput}
                  isSaving={isSavingToDraft}
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
                        {selectedWorkflow ? `当前工作流：${selectedWorkflow.displayName}` : '普通对话模式'}
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
          <div className="chat-thread-shell flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {selectedWorkflow && (
                <button
                  onClick={() => setSelectedWorkflow(null)}
                  className="focus-ring rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700"
                >
                  当前工作流：{selectedWorkflow.displayName} · 点击清除
                </button>
              )}
              {activeAiModel?.configured && (
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <span>
                    当前模型：
                    <span className="ml-1 font-medium text-slate-900">
                      {activeAiModel.provider === 'ollama'
                        ? activeAiModel.effectiveModelName || '未解析'
                        : activeAiModel.configuredModelName || activeAiModel.configuredName}
                    </span>
                  </span>
                </div>
              )}

            </div>

            <div className="relative flex gap-3">
              <input
                type="text"
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
                  if (e.key === 'Enter') {
                    void handleSendMessage()
                  } else if (e.key === 'Escape') {
                    setInputMessage('')
                    setShowWorkflowSuggestions(false)
                  }
                }}
                placeholder={
                  selectedWorkflow
                    ? `继续在 ${selectedWorkflow.displayName} 下输入任务...`
                    : '输入自然语言，或用 /工作流名称 调用工作流...'
                }
                className="focus-ring flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 placeholder:text-editorial-muted focus:border-blue-300 focus:bg-white focus:outline-none"
              />
              <button
                onClick={() => void handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="focus-ring flex items-center gap-2 rounded-2xl bg-gradient-to-r from-editorial-violet to-editorial-cyan px-6 py-4 text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="发送消息"
              >
                <Send className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
                {isLoading ? '思考中...' : '发送'}
              </button>

              {showWorkflowSuggestions && filteredWorkflows.length > 0 && (
                <div className="absolute bottom-[calc(100%+12px)] left-0 z-20 w-full rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                  <p className="px-2 pb-2 text-xs uppercase tracking-[0.18em] text-editorial-muted">Workflow Suggestions</p>
                  <div className="space-y-2">
                    {filteredWorkflows.map((workflow) => (
                      <button
                        key={workflow.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectWorkflow(workflow, true)}
                        className="focus-ring flex w-full items-start justify-between rounded-2xl border border-transparent bg-slate-50 px-4 py-3 text-left transition-colors hover:border-slate-200 hover:bg-white"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Workflow className="mt-0.5 h-4 w-4 text-blue-500" />
                            <p className="font-medium text-slate-900">{workflow.displayName}</p>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-editorial-muted">{workflow.description}</p>
                        </div>
                        <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
                          {workflow.invocation.primary}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
