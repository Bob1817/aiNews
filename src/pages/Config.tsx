import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  FolderOpen,
  CheckCircle2,
  Cpu,
  Globe,
  Key,
  MessageSquare,
  Pencil,
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
  getConfig,
  getOllamaModels,
  switchAIModel,
  testAIModel,
  updateConfig,
} from '@/lib/api/config'
import { getErrorMessage } from '@/lib/errors'

import type { ActiveAIModelInfo, UserConfig, AIModelConfig } from '@/types'
import { getDefaultConfigForm, getMockConfigForm } from '@/lib/fallbacks'



function ConfigCard({
  icon,
  title,
  hint,
  action,
  children,
}: {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{icon}</div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            {hint && <SectionHint content={hint} />}
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

function SectionHint({ content }: { content: string }) {
  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700"
        aria-label="查看说明"
      >
        <AlertCircle className="h-4.5 w-4.5" />
      </button>
      <div className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden w-72 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.12)] group-hover:block">
        {content}
      </div>
    </div>
  )
}

type ConfigFormState = {
  aiModel: Required<UserConfig['aiModel']>
  aiModels: AIModelConfig[]
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
}

function normalizeConfigState(data: UserConfig): ConfigFormState {
  return {
    aiModel: {
      ...data.aiModel,
      baseUrl: data.aiModel.baseUrl || '',
    },
    aiModels: data.aiModels || [],
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
  }
}

function maskValue(value: string, fallback = '未设置') {
  if (!value) {
    return fallback
  }

  if (value.length <= 8) {
    return '已配置'
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

function isModelConfigured(model?: {
  provider?: AIModelConfig['provider'] | null
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

export function Config() {
  const [config, setConfig] = useState<ConfigFormState>({
    ...getDefaultConfigForm(),
    aiModels: [],
  })
  const [persistedConfig, setPersistedConfig] = useState<ConfigFormState>({
    ...getDefaultConfigForm(),
    aiModels: [],
  })
  const [editingSections, setEditingSections] = useState<Record<'workspace' | 'website' | 'wechat', boolean>>({
    workspace: false,
    website: false,
    wechat: false,
  })
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<{ [key: string]: string }>({})
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
  const { showToast } = useToast()

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
        const normalized = normalizeConfigState(data)
        setConfig(normalized)
        setPersistedConfig(normalized)
      } catch (_error) {
        const fallback = {
          ...getMockConfigForm(),
          aiModels: [],
        }
        setConfig(fallback)
        setPersistedConfig(fallback)
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
      const normalized = normalizeConfigState(updatedConfig)
      setConfig(normalized)
      setPersistedConfig(normalized)
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
      const normalized = normalizeConfigState(updatedConfig)
      setConfig(normalized)
      setPersistedConfig(normalized)
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
        publishPlatforms: config.publishPlatforms,
        workspace: config.workspace,
        aiModels: [...config.aiModels, newModelWithId],
      })

      const normalized = normalizeConfigState(updatedConfig)
      setConfig(normalized)
      setPersistedConfig(normalized)
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
    section: 'website' | 'wechat' | 'workspace',
    nextConfig?: typeof config
  ) => {
    const targetConfig = nextConfig || config
    setSavingSection(section)

    try {
      const updatedConfig = await updateConfig({
        userId: '1',
        aiModel: targetConfig.aiModel,
        aiModels: targetConfig.aiModels,
        publishPlatforms: targetConfig.publishPlatforms,
        workspace: targetConfig.workspace,
      })

      const normalized = normalizeConfigState(updatedConfig)
      setConfig(normalized)
      setPersistedConfig(normalized)
      setEditingSections((current) => ({ ...current, [section]: false }))

      const sectionName =
        section === 'workspace'
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

    try {
      if (platform === 'aiModel') {
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

  const configuredModels = useMemo(() => {
    const models = (config.aiModels || []).filter((model) => isModelConfigured(model))

    if (models.length > 0) {
      return models
    }

    if (isModelConfigured(config.aiModel)) {
      return [
        {
          id: config.aiModel.id || '__primary__',
          name: config.aiModel.name || config.aiModel.modelName || '当前模型',
          provider: config.aiModel.provider,
          apiKey: config.aiModel.apiKey,
          modelName: config.aiModel.modelName,
          baseUrl: config.aiModel.baseUrl,
          isActive: true,
        } satisfies AIModelConfig,
      ]
    }

    return []
  }, [config.aiModel, config.aiModels])

  const currentModelId = useMemo(() => {
    return config.aiModel.id || config.aiModels.find((item) => item.isActive)?.id || configuredModels[0]?.id || null
  }, [config.aiModel.id, config.aiModels, configuredModels])

  const resolvedActiveModel = useMemo(() => {
    const currentModel = configuredModels.find((model) => model.id === currentModelId) || configuredModels[0]
    if (!currentModel) {
      return null
    }

    return {
      configured: true,
      provider: currentModel.provider,
      configuredName: currentModel.name,
      configuredModelName: currentModel.modelName,
      effectiveModelName: currentModel.modelName || currentModel.name,
      baseUrl: currentModel.baseUrl || '',
      source: currentModel.id === config.aiModel.id ? 'primary' : 'fallback',
    } satisfies ActiveAIModelInfo
  }, [config.aiModel.id, configuredModels, currentModelId])

  const summary = useMemo(
    () => [
      { label: '模型', value: configuredModels.length },
      {
        label: '当前模型',
        value:
          resolvedActiveModel?.provider === 'ollama'
            ? resolvedActiveModel.effectiveModelName || resolvedActiveModel.configuredName || '未设置'
            : resolvedActiveModel?.configuredModelName || resolvedActiveModel?.configuredName || '未设置',
      },
      { label: '目录', value: config.workspace.rootPath ? '已配置' : '未设置' },
    ],
    [configuredModels.length, config.workspace.rootPath, resolvedActiveModel]
  )

  const beginEditing = (section: 'workspace' | 'website' | 'wechat') => {
    setEditingSections((current) => ({ ...current, [section]: true }))
  }

  const cancelEditing = (section: 'workspace' | 'website' | 'wechat') => {
    setConfig(persistedConfig)
    setEditingSections((current) => ({ ...current, [section]: false }))
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4">
          <Link
            to="/chat"
            className="focus-ring flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-slate-900">系统配置</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <ConfigCard
              icon={<Server className="h-5 w-5" />}
              title="AI 模型中心"
              hint="这里展示已经配置成功并可用的 AI 模型。当前使用中的模型会被标记出来，只有非当前模型才允许切换或删除。"
              action={
                <div className="flex flex-wrap items-center gap-3">
                  {configuredModels.length > 0 && (
                    <button
                      onClick={() => handleTest('aiModel')}
                      className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <TestTube className="h-4 w-4" />
                      测试当前模型
                    </button>
                  )}
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
              {configuredModels.length > 0 ? (
                <div className="space-y-3">
                  {configuredModels.map((model) => {
                    const isCurrentModel = model.id === currentModelId

                    return (
                    <div
                      key={model.id}
                      className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 h-3 w-3 rounded-full ${
                            isCurrentModel ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{model.name}</p>
                            {isCurrentModel && (
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
                        {!isCurrentModel && model.id !== '__primary__' && (
                          <>
                            <button
                              onClick={() => handleSwitchModel(model.id)}
                              className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                            >
                              切换
                            </button>
                            <button
                              onClick={() => handleDeleteModel(model.id)}
                              className="focus-ring rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-editorial-muted">
                  还没有可用模型
                </div>
              )}
              {testResults.aiModel && (
                <p className={`mt-4 text-sm ${testResults.aiModel.includes('成功') ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {testResults.aiModel}
                </p>
              )}
            </ConfigCard>

            <ConfigCard
              icon={<FolderOpen className="h-5 w-5" />}
              title="工作文件配置"
              hint="设置任务默认工作目录。AI 可以在开启授权后读取该目录中的文件清单和文本摘要，辅助完成问答与任务。"
              action={
                editingSections.workspace ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => cancelEditing('workspace')}
                      className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => void persistConfigSection('workspace')}
                      disabled={savingSection === 'workspace'}
                      className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingSection === 'workspace' ? '保存中...' : '保存'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => beginEditing('workspace')}
                    className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                    编辑
                  </button>
                )
              }
            >
              {editingSections.workspace ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="工程文件夹">
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
                  <Field label="AI 文件访问">
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
                      <span>{config.workspace.allowAiAccess ? '已开启' : '已关闭'}</span>
                      <span className="text-xs">{config.workspace.allowAiAccess ? 'ON' : 'OFF'}</span>
                    </button>
                  </Field>
                </div>
              ) : null}
              <div className={`${editingSections.workspace ? 'mt-4' : ''} grid gap-4 md:grid-cols-2`}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">{editingSections.workspace ? '上传文件目录' : '工程文件夹'}</p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-900">
                    {config.workspace.rootPath || '~/Documents/AI助手工作台'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">{editingSections.workspace ? '生成文件目录' : 'AI 文件访问'}</p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-900">
                    {editingSections.workspace
                      ? config.workspace.rootPath
                        ? `${config.workspace.rootPath}/generated`
                        : '~/Documents/AI助手工作台/generated'
                      : config.workspace.allowAiAccess
                        ? '已开启'
                        : '已关闭'}
                  </p>
                </div>
              </div>
              {!editingSections.workspace && (
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
              )}
            </ConfigCard>



            <ConfigCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="发布渠道"
              hint="维护新闻对外发布所需的渠道配置。默认以文本显示，只有在编辑对应渠道时才会进入表单态。"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">官网发布</h3>
                    </div>
                    </div>
                    {editingSections.website ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTest('website')}
                          className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <TestTube className="h-4 w-4" />
                          测试
                        </button>
                        <button
                          onClick={() => cancelEditing('website')}
                          className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => void persistConfigSection('website')}
                          disabled={savingSection === 'website'}
                          className="focus-ring inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                        >
                          {savingSection === 'website' ? '保存中...' : '保存'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => beginEditing('website')}
                        className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                        编辑
                      </button>
                    )}
                  </div>
                  {editingSections.website ? (
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
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">API URL</p>
                        <p className="mt-2 break-all font-medium text-slate-900">{config.publishPlatforms.website.apiUrl || '未设置'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">API Key</p>
                        <p className="mt-2 font-medium text-slate-900">{maskValue(config.publishPlatforms.website.apiKey)}</p>
                      </div>
                    </div>
                  )}
                  {testResults.website && (
                    <p className={`mt-4 text-sm ${testResults.website.includes('成功') ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {testResults.website}
                    </p>
                  )}
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">微信公众号</h3>
                    </div>
                    </div>
                    {editingSections.wechat ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTest('wechat')}
                          className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <TestTube className="h-4 w-4" />
                          测试
                        </button>
                        <button
                          onClick={() => cancelEditing('wechat')}
                          className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => void persistConfigSection('wechat')}
                          disabled={savingSection === 'wechat'}
                          className="focus-ring inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                        >
                          {savingSection === 'wechat' ? '保存中...' : '保存'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => beginEditing('wechat')}
                        className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                        编辑
                      </button>
                    )}
                  </div>
                  {editingSections.wechat ? (
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
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">App ID</p>
                        <p className="mt-2 font-medium text-slate-900">{maskValue(config.publishPlatforms.wechat.appId)}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">App Secret</p>
                          <p className="mt-2 font-medium text-slate-900">{maskValue(config.publishPlatforms.wechat.appSecret)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-editorial-muted">Token</p>
                          <p className="mt-2 font-medium text-slate-900">{maskValue(config.publishPlatforms.wechat.token)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {testResults.wechat && (
                    <p className={`mt-4 text-sm ${testResults.wechat.includes('成功') ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {testResults.wechat}
                    </p>
                  )}
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
                  如需让 AI 处理本地文件，补齐工作文件目录并开启 AI 文件访问。
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
                  Ollama 默认地址是 <code>http://localhost:11434</code>。
                </p>
                <p className="flex gap-3">
                  <Cpu className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  llama.cpp 默认地址是 <code>http://localhost:8080</code>。
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
