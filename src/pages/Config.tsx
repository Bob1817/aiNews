import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  FolderOpen,
  CheckCircle2,
  Cpu,
  Globe,
  Key,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Server,
  Sparkles,
  TestTube,
  Trash2,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/lib/toast'
import {
  deleteAIModel,
  getActiveAIModel,
  getConfig,
  getOllamaModels,
  switchAIModel,
  testAIModel,
  updateConfig,
} from '@/lib/api/config'
import { getErrorMessage } from '@/lib/errors'
import { testNewsApi } from '@/lib/api/news'
import type { ActiveAIModelInfo, UserConfig, AIModelConfig } from '@/types'
import { getDefaultConfigForm, getMockConfigForm } from '@/lib/fallbacks'

type NewsApiDiagnostic = {
  tone: 'info' | 'warning' | 'error'
  title: string
  detail: string
}

function getNewsApiDiagnosis(message: string): NewsApiDiagnostic {
  const normalized = message.toLowerCase()

  if (normalized.includes('超时') || normalized.includes('timed out') || normalized.includes('timeout')) {
    return {
      tone: 'warning',
      title: '网络超时',
      detail: '当前环境没有在预期时间内连上新闻源服务。优先检查网络、代理、防火墙，或稍后重试。',
    }
  }

  if (
    normalized.includes('401') ||
    normalized.includes('api key invalid') ||
    normalized.includes('apikeymissing') ||
    (normalized.includes('key') && normalized.includes('invalid'))
  ) {
    return {
      tone: 'error',
      title: 'Key 无效',
      detail: '接口已经返回鉴权失败。请确认 API Key 是否完整、是否复制错位，或该 key 是否已失效。',
    }
  }

  if (
    normalized.includes('403') ||
    normalized.includes('426') ||
    normalized.includes('429') ||
    normalized.includes('denied') ||
    normalized.includes('rate limit') ||
    normalized.includes('请求失败')
  ) {
    return {
      tone: 'error',
      title: '接口拒绝',
      detail: '请求已经到达新闻源，但被服务端拒绝。常见原因是权限不足、额度用尽、地区限制或调用频率过高。',
    }
  }

  return {
    tone: 'info',
    title: '连接诊断',
    detail: '测试请求没有正常完成，请根据返回文案继续排查。',
  }
}

function ConfigCard({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{icon}</div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-editorial-muted">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint && <p className="text-xs leading-5 text-editorial-muted">{hint}</p>}
      {children}
    </label>
  )
}

function inputClassName() {
  return 'focus-ring w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-editorial-muted'
}

export function Config() {
  const [config, setConfig] = useState<{
    aiModel: Required<UserConfig['aiModel']>
    aiModels: AIModelConfig[]
    newsAPI?: UserConfig['newsAPI']
    publishPlatforms: {
      website: {
        apiUrl: string
        apiKey: string
      }
      wechat: {
        appId: string
        appSecret: string
        token: string
      }
    }
    workspace: UserConfig['workspace']
  }>({
    ...getDefaultConfigForm(),
    aiModels: [],
  })
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<{ [key: string]: string }>({})
  const [testDiagnostics, setTestDiagnostics] = useState<Record<string, NewsApiDiagnostic>>({})
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string; model: string }>>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [showAddModelModal, setShowAddModelModal] = useState(false)
  const [newModel, setNewModel] = useState<{
    name: string
    provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'llamacpp'
    apiKey: string
    modelName: string
    baseUrl: string
  }>({
    name: '',
    provider: 'openai',
    apiKey: '',
    modelName: '',
    baseUrl: '',
  })
  const [isTestingNewModel, setIsTestingNewModel] = useState(false)
  const [isSavingNewModel, setIsSavingNewModel] = useState(false)
  const [activeAiModel, setActiveAiModel] = useState<ActiveAIModelInfo | null>(null)
  const { showToast } = useToast()

  const refreshActiveAiModel = async () => {
    try {
      const data = await getActiveAIModel('1')
      setActiveAiModel(data)
    } catch (_error) {
      setActiveAiModel(null)
    }
  }

  const fetchOllamaModels = async () => {
    if (newModel.provider === 'ollama' && newModel.baseUrl) {
      setIsFetchingModels(true)
      try {
        const data = await getOllamaModels(newModel.baseUrl)
        setOllamaModels(data.models)
      } catch (_error) {
        showToast({
          title: '获取模型列表失败',
          message: '无法连接到 Ollama 服务，请确保 Ollama 已启动。',
          variant: 'error',
        })
      } finally {
        setIsFetchingModels(false)
      }
    }
  }

  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        const data = await getConfig('1')
        setConfig({
          aiModel: {
            ...data.aiModel,
            baseUrl: data.aiModel.baseUrl || '',
          },
          aiModels: data.aiModels || [],
          newsAPI: data.newsAPI
            ? {
                ...data.newsAPI,
                baseUrl: data.newsAPI.baseUrl || '',
              }
            : undefined,
          publishPlatforms: {
            website: {
              apiUrl: data.publishPlatforms.website?.apiUrl || '',
              apiKey: data.publishPlatforms.website?.apiKey || '',
            },
            wechat: {
              appId: data.publishPlatforms.wechat?.appId || '',
              appSecret: data.publishPlatforms.wechat?.appSecret || '',
              token: data.publishPlatforms.wechat?.token || '',
            },
          },
          workspace: {
            rootPath: data.workspace?.rootPath || '',
            allowAiAccess: data.workspace?.allowAiAccess ?? true,
          },
        })
        await refreshActiveAiModel()
      } catch (_error) {
        setConfig({
          ...getMockConfigForm(),
          aiModels: [],
        })
        setActiveAiModel(null)
        showToast({
          title: '配置加载失败',
          message: '已切换为演示配置。',
          variant: 'info',
        })
      }
    }

    fetchConfigData()
  }, [showToast])

  useEffect(() => {
    if (newModel.provider === 'ollama' && newModel.baseUrl) {
      fetchOllamaModels()
    } else {
      setOllamaModels([])
    }
  }, [newModel.provider, newModel.baseUrl])

  const handleSwitchModel = async (modelId: string) => {
    try {
      const updatedConfig = await switchAIModel({
        userId: '1',
        modelId,
      })
      setConfig((current) => ({
        ...current,
        aiModel: {
          ...updatedConfig.aiModel,
          baseUrl: updatedConfig.aiModel.baseUrl || '',
        },
        aiModels: updatedConfig.aiModels || [],
      }))
      await refreshActiveAiModel()
      showToast({
        title: '模型切换成功',
        variant: 'success',
      })
    } catch (error) {
      showToast({
        title: '切换模型失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    if (config.aiModel.id === modelId) {
      showToast({
        title: '无法删除当前使用的模型',
        message: '请先切换到其他模型再删除',
        variant: 'error',
      })
      return
    }

    try {
      const updatedConfig = await deleteAIModel({
        userId: '1',
        modelId,
      })
      setConfig((current) => ({
        ...current,
        aiModels: updatedConfig.aiModels || [],
      }))
      await refreshActiveAiModel()
      showToast({
        title: '模型删除成功',
        variant: 'success',
      })
    } catch (error) {
      showToast({
        title: '删除模型失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    }
  }

  const handleTestNewModel = async () => {
    setIsTestingNewModel(true)
    try {
      const data = await testAIModel({
        aiModel: {
          id: 'temp',
          name: newModel.name,
          provider: newModel.provider,
          apiKey: newModel.apiKey,
          modelName: newModel.modelName,
          baseUrl: newModel.baseUrl,
        },
      })

      showToast({
        title: data.success ? '测试成功' : '测试失败',
        message: data.message,
        variant: data.success ? 'success' : 'error',
      })
    } catch (error) {
      showToast({
        title: '测试失败',
        message: getErrorMessage(error, '请检查配置是否正确'),
        variant: 'error',
      })
    } finally {
      setIsTestingNewModel(false)
    }
  }

  const resetNewModelForm = () => {
    setShowAddModelModal(false)
    setNewModel({
      name: '',
      provider: 'openai',
      apiKey: '',
      modelName: '',
      baseUrl: '',
    })
  }

  const handleSaveNewModel = async () => {
    if (!newModel.name) {
      showToast({
        title: '请输入模型名称',
        variant: 'error',
      })
      return
    }

    setIsSavingNewModel(true)
    try {
      const testResult = await testAIModel({
        aiModel: {
          id: 'temp',
          name: newModel.name,
          provider: newModel.provider,
          apiKey: newModel.apiKey,
          modelName: newModel.modelName,
          baseUrl: newModel.baseUrl,
        },
      })

      if (!testResult.success) {
        showToast({
          title: '测试失败',
          message: testResult.message,
          variant: 'error',
        })
        return
      }

      const modelId = `model_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      const isFirstModel = config.aiModels.length === 0

      const newModelWithId = {
        id: modelId,
        name: newModel.name,
        provider: newModel.provider,
        apiKey: newModel.apiKey,
        modelName: newModel.modelName,
        baseUrl: newModel.baseUrl,
        isActive: isFirstModel,
      }

      const updatedConfig = await updateConfig({
        userId: '1',
        aiModel: isFirstModel
          ? {
              id: modelId,
              name: newModel.name,
              provider: newModel.provider,
              apiKey: newModel.apiKey,
              modelName: newModel.modelName,
              baseUrl: newModel.baseUrl,
            }
          : config.aiModel,
        newsAPI: config.newsAPI,
        publishPlatforms: config.publishPlatforms,
        workspace: config.workspace,
        aiModels: [...config.aiModels, newModelWithId],
      })

      setConfig((current) => ({
        ...current,
        aiModels: updatedConfig.aiModels || [],
        aiModel: {
          ...updatedConfig.aiModel,
          baseUrl: updatedConfig.aiModel.baseUrl || '',
        },
      }))
      await refreshActiveAiModel()
      resetNewModelForm()
      showToast({
        title: '模型添加成功',
        variant: 'success',
      })
    } catch (error) {
      showToast({
        title: '保存失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSavingNewModel(false)
    }
  }

  const persistConfigSection = async (
    section: 'newsAPI' | 'website' | 'wechat' | 'workspace',
    nextConfig?: typeof config
  ) => {
    const targetConfig = nextConfig || config
    setSavingSection(section)

    try {
      const updatedConfig = await updateConfig({
        userId: '1',
        aiModel: targetConfig.aiModel,
        aiModels: targetConfig.aiModels,
        newsAPI: targetConfig.newsAPI,
        publishPlatforms: targetConfig.publishPlatforms,
        workspace: targetConfig.workspace,
      })

      setConfig({
        aiModel: {
          ...updatedConfig.aiModel,
          baseUrl: updatedConfig.aiModel.baseUrl || '',
        },
        aiModels: updatedConfig.aiModels || [],
        newsAPI: updatedConfig.newsAPI
          ? {
              ...updatedConfig.newsAPI,
              baseUrl: updatedConfig.newsAPI.baseUrl || '',
            }
          : undefined,
        publishPlatforms: {
          website: {
            apiUrl: updatedConfig.publishPlatforms.website?.apiUrl || '',
            apiKey: updatedConfig.publishPlatforms.website?.apiKey || '',
          },
          wechat: {
            appId: updatedConfig.publishPlatforms.wechat?.appId || '',
            appSecret: updatedConfig.publishPlatforms.wechat?.appSecret || '',
            token: updatedConfig.publishPlatforms.wechat?.token || '',
          },
        },
        workspace: {
          rootPath: updatedConfig.workspace?.rootPath || '',
          allowAiAccess: updatedConfig.workspace?.allowAiAccess ?? true,
        },
      })
      await refreshActiveAiModel()

      const sectionName =
        section === 'newsAPI'
          ? '新闻源配置'
          : section === 'workspace'
            ? '工作文件配置'
          : section === 'website'
            ? '官网发布配置'
            : '公众号发布配置'

      showToast({
        title: `${sectionName}已保存`,
        variant: 'success',
      })
    } catch (error) {
      showToast({
        title: '保存配置失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setSavingSection(null)
    }
  }

  const handleTest = async (platform: string) => {
    setTestResults((current) => ({ ...current, [platform]: '测试中...' }))
    setTestDiagnostics((current) => {
      const next = { ...current }
      delete next[platform]
      return next
    })

    try {
      if (platform === 'newsAPI' && config.newsAPI) {
        const data = await testNewsApi({
          provider: config.newsAPI.provider,
          apiKey: config.newsAPI.apiKey,
          baseUrl: config.newsAPI.baseUrl,
        })
        setTestResults((current) => ({
          ...current,
          [platform]: data.success ? data.message : `测试失败: ${data.message}`,
        }))
        if (!data.success) {
          setTestDiagnostics((current) => ({
            ...current,
            [platform]: getNewsApiDiagnosis(data.message),
          }))
        }
        showToast({
          title: data.success ? '测试成功' : '测试失败',
          message: data.message,
          variant: data.success ? 'success' : 'error',
        })
      } else if (platform === 'aiModel') {
        const data = await testAIModel({
          aiModel: config.aiModel,
        })
        setTestResults((current) => ({
          ...current,
          [platform]: data.success ? data.message : `测试失败: ${data.message}`,
        }))
        showToast({
          title: data.success ? '测试成功' : '测试失败',
          message: data.message,
          variant: data.success ? 'success' : 'error',
        })
      } else {
        setTimeout(() => {
          setTestResults((current) => ({ ...current, [platform]: '测试成功' }))
          showToast({
            title: '测试成功',
            message: `${platform} 连接测试通过。`,
            variant: 'success',
          })
        }, 600)
      }
    } catch (error) {
      const message = getErrorMessage(error, '请稍后重试')
      setTestResults((current) => ({
        ...current,
        [platform]: `测试失败: ${message}`,
      }))
      if (platform === 'newsAPI') {
        setTestDiagnostics((current) => ({
          ...current,
          [platform]: getNewsApiDiagnosis(message),
        }))
      }
      showToast({
        title: '测试连接失败',
        message,
        variant: 'error',
      })
    }
  }

  const providerLabel = (provider: AIModelConfig['provider']) => {
    if (provider === 'openai') return 'OpenAI'
    if (provider === 'anthropic') return 'Anthropic'
    if (provider === 'google') return 'Google'
    if (provider === 'ollama') return 'Ollama'
    return 'llama.cpp'
  }

  const summary = useMemo(
    () => [
      { label: '已配置模型', value: config.aiModels.length },
      {
        label: '当前生效模型',
        value:
          activeAiModel?.provider === 'ollama'
            ? activeAiModel.effectiveModelName || '未设置'
            : activeAiModel?.configuredModelName || activeAiModel?.configuredName || '未设置',
      },
      { label: '新闻源', value: config.newsAPI?.provider || '未设置' },
      { label: '工作目录', value: config.workspace.rootPath ? '已配置' : '未设置' },
    ],
    [activeAiModel, config.aiModels.length, config.newsAPI?.provider, config.workspace.rootPath]
  )

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4">
          <Link
            to="/chat"
            className="focus-ring flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <div className="flex-1">
            <span className="eyebrow">Workspace Infrastructure</span>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">系统配置</h1>
            <p className="mt-2 text-sm leading-6 text-editorial-muted">
              统一管理模型、新闻源和发布渠道。配置完成后，聊天工作流就能直接复用这些能力。
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <ConfigCard
              icon={<Server className="h-5 w-5" />}
              title="AI 模型中心"
              description="把模型管理做成一个清晰的列表与当前使用态，减少“保存一次就覆盖全部”的不确定感。"
              action={
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-editorial-muted">模型操作会自动保存</span>
                  <button
                    onClick={() => setShowAddModelModal(true)}
                    className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <Plus className="h-4 w-4" />
                    新增模型
                  </button>
                </div>
              }
            >
              {config.aiModels.length > 0 ? (
                <div className="space-y-3">
                  {config.aiModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 h-3 w-3 rounded-full ${
                            model.id === config.aiModel.id ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{model.name}</p>
                            {model.id === config.aiModel.id && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                当前使用
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-editorial-muted">
                            {providerLabel(model.provider)}
                            {model.modelName ? ` · ${model.modelName}` : ''}
                            {model.baseUrl ? ` · ${model.baseUrl}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSwitchModel(model.id)}
                          disabled={model.id === config.aiModel.id}
                          className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                        >
                          切换
                        </button>
                        <button
                          onClick={() => handleDeleteModel(model.id)}
                          className="focus-ring rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-editorial-muted">
                  还没有添加任何模型。建议先添加一个主用模型，让聊天和工作流先稳定可用。
                </div>
              )}

              {config.aiModel.id && (
                <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">当前模型详情</p>
                      <p className="mt-1 text-sm text-editorial-muted">用于聊天与工作流执行的主模型。</p>
                    </div>
                    <button
                      onClick={() => handleTest('aiModel')}
                      className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <TestTube className="h-4 w-4" />
                      测试连接
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">模型名称</p>
                      <p className="mt-2 font-medium text-slate-900">{config.aiModel.name}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">提供商</p>
                      <p className="mt-2 font-medium text-slate-900">{providerLabel(config.aiModel.provider)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">模型 ID</p>
                      <p className="mt-2 font-medium text-slate-900">{config.aiModel.modelName || '未填写'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">基础 URL</p>
                      <p className="mt-2 font-medium text-slate-900">{config.aiModel.baseUrl || '默认地址'}</p>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-blue-700">当前实际生效模型</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
                        <p className="font-medium text-slate-900">
                          {activeAiModel?.provider === 'ollama'
                            ? activeAiModel.effectiveModelName || '未解析'
                            : activeAiModel?.configuredModelName || activeAiModel?.configuredName || '未设置'}
                        </p>
                        {activeAiModel?.provider && (
                          <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs text-blue-700">
                            {providerLabel(activeAiModel.provider)}
                          </span>
                        )}
                        {activeAiModel?.source && (
                          <span className="text-xs text-editorial-muted">
                            {activeAiModel.source === 'primary' ? '来源：当前主模型配置' : '来源：激活模型回退'}
                          </span>
                        )}
                      </div>
                      {activeAiModel?.provider === 'ollama' && activeAiModel.configuredModelName !== activeAiModel.effectiveModelName && (
                        <p className="mt-2 text-sm text-editorial-muted">
                          当前配置未显式填写模型 ID，运行时已自动解析为 <span className="font-medium text-slate-900">{activeAiModel.effectiveModelName}</span>。
                        </p>
                      )}
                    </div>
                  </div>
                  {testResults.aiModel && (
                    <p className={`mt-4 text-sm ${testResults.aiModel.includes('成功') ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {testResults.aiModel}
                    </p>
                  )}
                </div>
              )}
            </ConfigCard>

            <ConfigCard
              icon={<FolderOpen className="h-5 w-5" />}
              title="工作文件配置"
              description="安装程序后会默认创建一个工程文件夹，用于存放上传文件、生成文件和任务相关材料。AI 对话时可以读取该目录的文件信息来辅助问答与任务执行。"
              action={
                <button
                  onClick={() => void persistConfigSection('workspace')}
                  disabled={savingSection === 'workspace'}
                  className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingSection === 'workspace' ? '保存中...' : '保存工作文件配置'}
                </button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="工程文件夹"
                  hint="默认用于存放任务相关文件；如果你不修改这里，系统会自动使用默认目录 `~/Documents/AI助手工作台`，并创建 uploads 与 generated 子目录。"
                >
                  <input
                    type="text"
                    value={config.workspace.rootPath}
                    onChange={(e) =>
                      setConfig((current) => ({
                        ...current,
                        workspace: {
                          ...current.workspace,
                          rootPath: e.target.value,
                        },
                      }))
                    }
                    placeholder="留空则使用默认目录：~/Documents/AI助手工作台"
                    className={inputClassName()}
                  />
                </Field>
                <Field
                  label="AI 文件访问"
                  hint="开启后，AI 在聊天时会读取该目录的文件清单和可读文本摘要，用于辅助任务与问答。"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((current) => ({
                        ...current,
                        workspace: {
                          ...current.workspace,
                          allowAiAccess: !current.workspace.allowAiAccess,
                        },
                      }))
                    }
                    className={`focus-ring flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors ${
                      config.workspace.allowAiAccess
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{config.workspace.allowAiAccess ? '已开启 AI 访问工作目录' : '已关闭 AI 访问工作目录'}</span>
                    <span className="text-xs">{config.workspace.allowAiAccess ? 'ON' : 'OFF'}</span>
                  </button>
                </Field>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">上传文件目录</p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-900">
                    {config.workspace.rootPath ? `${config.workspace.rootPath}/uploads` : '~/Documents/AI助手工作台/uploads'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">生成文件目录</p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-900">
                    {config.workspace.rootPath ? `${config.workspace.rootPath}/generated` : '~/Documents/AI助手工作台/generated'}
                  </p>
                </div>
              </div>
            </ConfigCard>

            <ConfigCard
              icon={<Globe className="h-5 w-5" />}
              title="新闻源配置"
              description="新闻推送工作流会直接依赖这里的新闻源设置。诊断区会帮助你更快判断是网络、权限还是额度问题。"
              action={
                <button
                  onClick={() => void persistConfigSection('newsAPI')}
                  disabled={savingSection === 'newsAPI'}
                  className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingSection === 'newsAPI' ? '保存中...' : '保存新闻源配置'}
                </button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="新闻源提供商">
                  <select
                    value={config.newsAPI?.provider || 'newsapi'}
                    onChange={(e) =>
                      setConfig((current) => ({
                        ...current,
                        newsAPI: {
                          ...current.newsAPI,
                          provider: e.target.value as 'newsapi' | 'guardian' | 'nytimes',
                        } as any,
                      }))
                    }
                    className={inputClassName()}
                  >
                    <option value="newsapi">NewsAPI</option>
                    <option value="guardian">The Guardian</option>
                    <option value="nytimes">New York Times</option>
                  </select>
                </Field>
                <Field label="基础 URL（可选）" hint="只有在使用自定义代理或第三方兼容地址时才需要填写。">
                  <input
                    type="url"
                    value={config.newsAPI?.baseUrl || ''}
                    onChange={(e) =>
                      setConfig((current) => ({
                        ...current,
                        newsAPI: {
                          ...current.newsAPI,
                          baseUrl: e.target.value,
                        } as any,
                      }))
                    }
                    placeholder="例如：https://newsapi.org/v2"
                    className={inputClassName()}
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="API Key">
                  <div className="relative">
                    <input
                      type="password"
                      value={config.newsAPI?.apiKey || ''}
                      onChange={(e) =>
                        setConfig((current) => ({
                          ...current,
                          newsAPI: {
                            ...current.newsAPI,
                            apiKey: e.target.value,
                          } as any,
                        }))
                      }
                      placeholder="请输入新闻源 API Key"
                      className={`${inputClassName()} pr-11`}
                    />
                    <Key className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleTest('newsAPI')}
                  className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <TestTube className="h-4 w-4" />
                  测试新闻源连接
                </button>
                {testResults.newsAPI && (
                  <p className={`text-sm ${testResults.newsAPI.includes('成功') ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {testResults.newsAPI}
                  </p>
                )}
              </div>
              {testDiagnostics.newsAPI && (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-4 text-sm ${
                    testDiagnostics.newsAPI.tone === 'error'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : testDiagnostics.newsAPI.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                  }`}
                >
                  <p className="font-medium">{testDiagnostics.newsAPI.title}</p>
                  <p className="mt-1 leading-6">{testDiagnostics.newsAPI.detail}</p>
                </div>
              )}
            </ConfigCard>

            <ConfigCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="发布渠道"
              description="把常用发布渠道整理到一起，便于结果页中的后续发布动作直接复用。"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">官网发布</h3>
                      <p className="text-sm text-editorial-muted">适合内部 CMS 或企业官网接口。</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Field label="API URL">
                      <input
                        type="url"
                        value={config.publishPlatforms.website.apiUrl}
                        onChange={(e) =>
                          setConfig((current) => ({
                            ...current,
                            publishPlatforms: {
                              ...current.publishPlatforms,
                              website: {
                                ...current.publishPlatforms.website,
                                apiUrl: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="请输入官网发布 API URL"
                        className={inputClassName()}
                      />
                    </Field>
                    <Field label="API Key">
                      <input
                        type="password"
                        value={config.publishPlatforms.website.apiKey}
                        onChange={(e) =>
                          setConfig((current) => ({
                            ...current,
                            publishPlatforms: {
                              ...current.publishPlatforms,
                              website: {
                                ...current.publishPlatforms.website,
                                apiKey: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="请输入官网发布 API Key"
                        className={inputClassName()}
                      />
                    </Field>
                    <button
                      onClick={() => void persistConfigSection('website')}
                      disabled={savingSection === 'website'}
                      className="focus-ring inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingSection === 'website' ? '保存中...' : '保存官网配置'}
                    </button>
                    <button
                      onClick={() => handleTest('website')}
                      className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <TestTube className="h-4 w-4" />
                      测试官网连接
                    </button>
                    {testResults.website && (
                      <p className={`text-sm ${testResults.website.includes('成功') ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {testResults.website}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">微信公众号</h3>
                      <p className="text-sm text-editorial-muted">适合面向公众输出内容时的后续发布。</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Field label="App ID">
                      <input
                        type="text"
                        value={config.publishPlatforms.wechat.appId}
                        onChange={(e) =>
                          setConfig((current) => ({
                            ...current,
                            publishPlatforms: {
                              ...current.publishPlatforms,
                              wechat: {
                                ...current.publishPlatforms.wechat,
                                appId: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="请输入微信公众号 App ID"
                        className={inputClassName()}
                      />
                    </Field>
                    <Field label="App Secret">
                      <input
                        type="password"
                        value={config.publishPlatforms.wechat.appSecret}
                        onChange={(e) =>
                          setConfig((current) => ({
                            ...current,
                            publishPlatforms: {
                              ...current.publishPlatforms,
                              wechat: {
                                ...current.publishPlatforms.wechat,
                                appSecret: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="请输入 App Secret"
                        className={inputClassName()}
                      />
                    </Field>
                    <Field label="Token">
                      <input
                        type="password"
                        value={config.publishPlatforms.wechat.token}
                        onChange={(e) =>
                          setConfig((current) => ({
                            ...current,
                            publishPlatforms: {
                              ...current.publishPlatforms,
                              wechat: {
                                ...current.publishPlatforms.wechat,
                                token: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="请输入 Token"
                        className={inputClassName()}
                      />
                    </Field>
                    <button
                      onClick={() => void persistConfigSection('wechat')}
                      disabled={savingSection === 'wechat'}
                      className="focus-ring inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingSection === 'wechat' ? '保存中...' : '保存公众号配置'}
                    </button>
                    <button
                      onClick={() => handleTest('wechat')}
                      className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <TestTube className="h-4 w-4" />
                      测试公众号连接
                    </button>
                    {testResults.wechat && (
                      <p className={`text-sm ${testResults.wechat.includes('成功') ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {testResults.wechat}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </ConfigCard>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <span className="eyebrow">System Summary</span>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">当前工作台状态</h2>
              <div className="mt-6 grid gap-3">
                {summary.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-editorial-muted">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <span className="eyebrow">Setup Order</span>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">推荐配置顺序</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-editorial-muted">
                <p className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  先添加并切换一个可用 AI 模型，确保聊天和工作流可执行。
                </p>
                <p className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  再配置新闻源，让“新闻推送”工作流能按关键词返回有效简报。
                </p>
                <p className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  最后补齐发布渠道，把满意内容继续分发到外部系统。
                </p>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <span className="eyebrow">Local Model Tips</span>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">本地模型提示</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-editorial-muted">
                <p className="flex gap-3">
                  <Cpu className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  Ollama 默认地址通常是 <code>http://localhost:11434</code>。
                </p>
                <p className="flex gap-3">
                  <Cpu className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  llama.cpp 默认地址通常是 <code>http://localhost:8080</code>。
                </p>
                <p className="flex gap-3">
                  <Sparkles className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  模型测试通过后再保存，可以减少“保存了但不能用”的配置脏状态。
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {showAddModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow">Add Model</span>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">新增 AI 模型</h3>
                <p className="mt-2 text-sm leading-6 text-editorial-muted">
                  先填写模型信息并测试连接，通过后再保存到模型中心。
                </p>
              </div>
              <button
                onClick={resetNewModelForm}
                className="focus-ring rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="模型名称">
                <input
                  type="text"
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  placeholder="例如：工作主模型 / 本地实验模型"
                  className={inputClassName()}
                />
              </Field>

              <Field label="模型提供商">
                <select
                  value={newModel.provider}
                  onChange={(e) => {
                    const provider = e.target.value as 'openai' | 'anthropic' | 'google' | 'ollama' | 'llamacpp'
                    setNewModel({
                      ...newModel,
                      provider,
                      baseUrl:
                        provider === 'ollama'
                          ? 'http://localhost:11434'
                          : provider === 'llamacpp'
                            ? 'http://localhost:8080'
                            : '',
                    })
                  }}
                  className={inputClassName()}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic" disabled>Anthropic（暂未接入）</option>
                  <option value="google" disabled>Google（暂未接入）</option>
                  <option value="ollama">Ollama (本地模型)</option>
                  <option value="llamacpp">llama.cpp (本地模型)</option>
                </select>
              </Field>

              {(newModel.provider === 'openai' || newModel.provider === 'anthropic' || newModel.provider === 'google') && (
                <div className="md:col-span-2">
                  <Field label="API Key">
                    <div className="relative">
                      <input
                        type="password"
                        value={newModel.apiKey}
                        onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                        placeholder="请输入 API Key"
                        className={`${inputClassName()} pr-11`}
                      />
                      <Key className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </Field>
                </div>
              )}

              <Field label="模型 ID">
                {newModel.provider === 'ollama' ? (
                  <div className="relative">
                    <select
                      value={newModel.modelName}
                      onChange={(e) => setNewModel({ ...newModel, modelName: e.target.value })}
                      className={`${inputClassName()} pr-11`}
                    >
                      <option value="">请选择模型</option>
                      {ollamaModels.map((model) => (
                        <option key={model.model} value={model.model}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={fetchOllamaModels}
                      disabled={isFetchingModels || !newModel.baseUrl}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${isFetchingModels ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={newModel.modelName}
                    onChange={(e) => setNewModel({ ...newModel, modelName: e.target.value })}
                    placeholder={newModel.provider === 'llamacpp' ? '可选，通常可留空' : '请输入模型 ID'}
                    className={inputClassName()}
                  />
                )}
              </Field>

              <Field label="基础 URL">
                <input
                  type="url"
                  value={newModel.baseUrl}
                  onChange={(e) => setNewModel({ ...newModel, baseUrl: e.target.value })}
                  placeholder={
                    newModel.provider === 'ollama'
                      ? 'http://localhost:11434'
                      : newModel.provider === 'llamacpp'
                        ? 'http://localhost:8080'
                        : '请输入基础 URL'
                  }
                  className={inputClassName()}
                />
              </Field>
            </div>

            {(newModel.provider === 'ollama' || newModel.provider === 'llamacpp') && (
              <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-800">
                <div className="flex items-start gap-3">
                  <Cpu className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {newModel.provider === 'ollama' ? 'Ollama 本地模型提示' : 'llama.cpp 本地模型提示'}
                    </p>
                    <p className="mt-2">
                      {newModel.provider === 'ollama'
                        ? '请确保 Ollama 服务已启动，且目标模型已经通过 `ollama pull` 下载完成。'
                        : '请确保 llama.cpp 服务已启动，并开放可访问的 HTTP 接口。'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleTestNewModel}
                disabled={isTestingNewModel || isSavingNewModel}
                className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
              >
                <TestTube className="h-4 w-4" />
                {isTestingNewModel ? '测试中...' : '先测试连接'}
              </button>
              <button
                onClick={handleSaveNewModel}
                disabled={isTestingNewModel || isSavingNewModel}
                className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-editorial-violet to-editorial-cyan px-4 py-3 text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSavingNewModel ? '保存中...' : '保存模型'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
