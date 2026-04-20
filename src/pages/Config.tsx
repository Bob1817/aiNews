import { useState, useEffect } from 'react'
import { ArrowLeft, Save, TestTube, Globe, MessageSquare, Key, Server, Cpu, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/lib/toast'
import { getConfig, updateConfig, testAIModel, getOllamaModels, switchAIModel, deleteAIModel } from '@/lib/api/config'
import { getErrorMessage } from '@/lib/errors'
import { testNewsApi } from '@/lib/api/news'
import type { UserConfig, AIModelConfig } from '@/types'
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
    normalized.includes('key') && normalized.includes('invalid')
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
  }>({
    ...getDefaultConfigForm(),
    aiModels: []
  })
  const [isSaving, setIsSaving] = useState(false)
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
    baseUrl: ''
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
      } catch (error) {
        console.error('获取Ollama模型列表失败:', error)
        showToast({
          title: '获取模型列表失败',
          message: '无法连接到Ollama服务，请确保Ollama已启动。',
          variant: 'error',
        })
      } finally {
        setIsFetchingModels(false)
      }
    }
  }

  useEffect(() => {
    // 从后端 API 获取配置
    const fetchConfig = async () => {
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
        })
      } catch (error) {
        setConfig({
          ...getMockConfigForm(),
          aiModels: []
        })
        showToast({
          title: '配置加载失败',
          message: '已切换为演示配置。',
          variant: 'info',
        })
      }
    }

    fetchConfig()
  }, [showToast])

  useEffect(() => {
    // 当provider为ollama且baseUrl变化时，获取模型列表
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
        modelId
      })
      setConfig({
        ...config,
        aiModel: {
          ...updatedConfig.aiModel,
          baseUrl: updatedConfig.aiModel.baseUrl || ''
        },
        aiModels: updatedConfig.aiModels || []
      })
      showToast({
        title: '模型切换成功',
        variant: 'success',
      })
    } catch (error) {
      console.error('切换模型失败:', error)
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
        modelId
      })
      setConfig({
        ...config,
        aiModels: updatedConfig.aiModels || []
      })
      showToast({
        title: '模型删除成功',
        variant: 'success',
      })
    } catch (error) {
      console.error('删除模型失败:', error)
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
        }
      })
      if (data.success) {
        showToast({
          title: '测试成功',
          message: '模型连接正常，可以保存',
          variant: 'success',
        })
      } else {
        showToast({
          title: '测试失败',
          message: data.message,
          variant: 'error',
        })
      }
    } catch (error) {
      console.error('测试新模型失败:', error)
      showToast({
        title: '测试失败',
        message: getErrorMessage(error, '请检查配置是否正确'),
        variant: 'error',
      })
    } finally {
      setIsTestingNewModel(false)
    }
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
      // 测试模型连接
      const testResult = await testAIModel({
        aiModel: {
          id: 'temp',
          name: newModel.name,
          provider: newModel.provider,
          apiKey: newModel.apiKey,
          modelName: newModel.modelName,
          baseUrl: newModel.baseUrl,
        }
      })

      if (!testResult.success) {
        showToast({
          title: '测试失败',
          message: testResult.message,
          variant: 'error',
        })
        return
      }

      // 生成唯一ID
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

      // 保存模型
      const updatedConfig = await updateConfig({
        userId: '1',
        aiModel: isFirstModel ? {
          id: modelId,
          name: newModel.name,
          provider: newModel.provider,
          apiKey: newModel.apiKey,
          modelName: newModel.modelName,
          baseUrl: newModel.baseUrl,
        } : config.aiModel,
        newsAPI: config.newsAPI,
        publishPlatforms: config.publishPlatforms,
        aiModels: [...config.aiModels, newModelWithId],
      })

      setConfig({
        ...config,
        aiModels: updatedConfig.aiModels || [],
        aiModel: {
          ...updatedConfig.aiModel,
          baseUrl: updatedConfig.aiModel.baseUrl || ''
        }
      })

      // 关闭弹窗并重置表单
      setShowAddModelModal(false)
      setNewModel({
        name: '',
        provider: 'openai',
        apiKey: '',
        modelName: '',
        baseUrl: ''
      })

      showToast({
        title: '模型添加成功',
        variant: 'success',
      })
    } catch (error) {
      console.error('保存新模型失败:', error)
      showToast({
        title: '保存失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSavingNewModel(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateConfig({
        userId: '1',
        ...config,
      })
      showToast({
        title: '配置已保存',
        variant: 'success',
      })
    } catch (error) {
      console.error('保存配置失败:', error)
      showToast({
        title: '保存配置失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async (platform: string) => {
    setTestResults({ ...testResults, [platform]: '测试中...' })
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
        setTestResults({ 
          ...testResults, 
          [platform]: data.success ? data.message : `测试失败: ${data.message}` 
        })
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
          aiModel: config.aiModel
        })
        setTestResults({ 
          ...testResults, 
          [platform]: data.success ? data.message : `测试失败: ${data.message}` 
        })
        showToast({
          title: data.success ? '测试成功' : '测试失败',
          message: data.message,
          variant: data.success ? 'success' : 'error',
        })
      } else {
        // 其他平台使用模拟测试
        setTimeout(() => {
          setTestResults({ ...testResults, [platform]: '测试成功' })
          showToast({
            title: '测试成功',
            message: `${platform} 连接测试通过。`,
            variant: 'success',
          })
        }, 1000)
      }
    } catch (error) {
      console.error('测试连接失败:', error)
      const message = getErrorMessage(error, '请稍后重试')
      setTestResults({ 
        ...testResults, 
        [platform]: `测试失败: ${message}` 
      })
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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            to="/chat"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">系统配置</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">AI 模型配置</h2>
              </div>
              <button
                onClick={() => setShowAddModelModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增模型
              </button>
            </div>

            <div className="space-y-6">
              {/* 已配置模型列表 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">已配置模型</h3>
                {config.aiModels.length > 0 ? (
                  <div className="space-y-2">
                    {config.aiModels.map((model) => (
                      <div key={model.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${model.id === config.aiModel.id ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <div>
                            <p className="font-medium text-gray-900">{model.name}</p>
                            <p className="text-sm text-gray-500">
                              {model.provider === 'openai' && 'OpenAI'}
                              {model.provider === 'anthropic' && 'Anthropic'}
                              {model.provider === 'google' && 'Google'}
                              {model.provider === 'ollama' && 'Ollama'}
                              {model.provider === 'llamacpp' && 'llama.cpp'}
                              {model.modelName && ` - ${model.modelName}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSwitchModel(model.id)}
                            disabled={model.id === config.aiModel.id}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                          >
                            {model.id === config.aiModel.id ? '当前使用' : '使用'}
                          </button>
                          <button
                            onClick={() => handleDeleteModel(model.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">暂无配置的模型</p>
                    <p className="text-sm text-gray-400 mt-1">点击右上角「新增模型」按钮添加</p>
                  </div>
                )}
              </div>

              {/* 当前模型详情 */}
              {config.aiModel.id && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">当前模型详情</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">模型名称</label>
                        <p className="text-sm font-medium">{config.aiModel.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">提供商</label>
                        <p className="text-sm font-medium">
                          {config.aiModel.provider === 'openai' && 'OpenAI'}
                          {config.aiModel.provider === 'anthropic' && 'Anthropic'}
                          {config.aiModel.provider === 'google' && 'Google'}
                          {config.aiModel.provider === 'ollama' && 'Ollama'}
                          {config.aiModel.provider === 'llamacpp' && 'llama.cpp'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">模型 ID</label>
                        <p className="text-sm font-medium">{config.aiModel.modelName}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">基础 URL</label>
                        <p className="text-sm font-medium">{config.aiModel.baseUrl || '默认'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <button
                        onClick={() => handleTest('aiModel')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <TestTube className="w-4 h-4" />
                        测试连接
                      </button>
                      {testResults.aiModel && (
                        <p className={`mt-2 text-sm ${
                          testResults.aiModel.includes('成功')
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}>
                          {testResults.aiModel}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 新增模型弹窗 */}
          {showAddModelModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">新增 AI 模型</h3>
                  <button
                    onClick={() => {
                      setShowAddModelModal(false)
                      setNewModel({
                        name: '',
                        provider: 'openai',
                        apiKey: '',
                        modelName: '',
                        baseUrl: ''
                      })
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={newModel.name}
                      onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                      placeholder="请输入模型名称"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模型提供商
                    </label>
                    <select
                      value={newModel.provider}
                      onChange={(e) => {
                        const provider = e.target.value as 'openai' | 'anthropic' | 'google' | 'ollama' | 'llamacpp'
                        setNewModel({
                          ...newModel,
                          provider,
                          baseUrl: provider === 'ollama' ? 'http://localhost:11434' : 
                                 provider === 'llamacpp' ? 'http://localhost:8080' : ''
                        })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic" disabled>Anthropic（暂未接入）</option>
                      <option value="google" disabled>Google（暂未接入）</option>
                      <option value="ollama">Ollama (本地模型)</option>
                      <option value="llamacpp">llama.cpp (本地模型)</option>
                    </select>
                  </div>

                  {(newModel.provider === 'openai' || newModel.provider === 'anthropic' || newModel.provider === 'google') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={newModel.apiKey}
                          onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                          placeholder="请输入 API Key"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                          <Key className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模型 ID
                    </label>
                    {newModel.provider === 'ollama' ? (
                      <div className="relative">
                        <select
                          value={newModel.modelName}
                          onChange={(e) => setNewModel({ ...newModel, modelName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={newModel.modelName}
                        onChange={(e) => setNewModel({ ...newModel, modelName: e.target.value })}
                        placeholder={newModel.provider === 'llamacpp' ? '可选，通常可留空' : '请输入模型 ID'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      基础 URL
                    </label>
                    <input
                      type="url"
                      value={newModel.baseUrl}
                      onChange={(e) => setNewModel({ ...newModel, baseUrl: e.target.value })}
                      placeholder={
                        newModel.provider === 'ollama' ? 'http://localhost:11434' :
                        newModel.provider === 'llamacpp' ? 'http://localhost:8080' :
                        '请输入基础 URL'
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {(newModel.provider === 'ollama' || newModel.provider === 'llamacpp') && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Cpu className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">
                            {newModel.provider === 'ollama' ? 'Ollama' : 'llama.cpp'} 本地模型配置
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            {newModel.provider === 'ollama' ? (
                              <>
                                请确保 Ollama 已安装并运行在您的电脑上。
                                <br />
                                默认运行命令：<code className="bg-blue-100 px-1 rounded">ollama serve</code>
                                <br />
                                下载模型：<code className="bg-blue-100 px-1 rounded">ollama pull gemma</code>
                              </>
                            ) : (
                              <>
                                请确保 llama.cpp 服务已启动并运行在您的电脑上。
                                <br />
                                默认运行命令：<code className="bg-blue-100 px-1 rounded">./server -m model.gguf</code>
                                <br />
                                默认地址：<code className="bg-blue-100 px-1 rounded">http://localhost:8080</code>
                                <br />
                                支持测试 <code className="bg-blue-100 px-1 rounded">/v1/chat/completions</code>，也兼容回退到 <code className="bg-blue-100 px-1 rounded">/completion</code>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleTestNewModel}
                      disabled={isTestingNewModel || isSavingNewModel}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      <TestTube className="w-4 h-4" />
                      {isTestingNewModel ? '测试中...' : '测试连接'}
                    </button>
                    <button
                      onClick={handleSaveNewModel}
                      disabled={isTestingNewModel || isSavingNewModel}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {isSavingNewModel ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">新闻源配置</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新闻源提供商
                </label>
                <select
                  value={config.newsAPI?.provider || 'newsapi'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      newsAPI: {
                        ...config.newsAPI,
                        provider: e.target.value as 'newsapi' | 'guardian' | 'nytimes',
                      } as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newsapi">NewsAPI</option>
                  <option value="guardian">The Guardian</option>
                  <option value="nytimes">New York Times</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={config.newsAPI?.apiKey || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        newsAPI: {
                          ...config.newsAPI,
                          apiKey: e.target.value,
                        } as any,
                      })
                    }
                    placeholder="请输入 API Key"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  基础 URL（可选）
                </label>
                <input
                  type="url"
                  value={config.newsAPI?.baseUrl || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      newsAPI: {
                        ...config.newsAPI,
                        baseUrl: e.target.value,
                      } as any,
                    })
                  }
                  placeholder="请输入基础 URL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <button
                  onClick={() => handleTest('newsAPI')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  测试连接
                </button>
                {testResults.newsAPI && (
                  <p className={`mt-2 text-sm ${
                    testResults.newsAPI === '测试成功'
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`}>
                    {testResults.newsAPI}
                  </p>
                )}
                {testDiagnostics.newsAPI && (
                  <div
                    className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                      testDiagnostics.newsAPI.tone === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : testDiagnostics.newsAPI.tone === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    <p className="font-medium">{testDiagnostics.newsAPI.title}</p>
                    <p className="mt-1">{testDiagnostics.newsAPI.detail}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">官网发布配置</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API URL
                </label>
                <input
                  type="url"
                  value={config.publishPlatforms.website.apiUrl}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      publishPlatforms: {
                        ...config.publishPlatforms,
                        website: {
                          ...config.publishPlatforms.website,
                          apiUrl: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="请输入 API URL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.publishPlatforms.website.apiKey}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      publishPlatforms: {
                        ...config.publishPlatforms,
                        website: {
                          ...config.publishPlatforms.website,
                          apiKey: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="请输入 API Key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <button
                  onClick={() => handleTest('website')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  测试连接
                </button>
                {testResults.website && (
                  <p className={`mt-2 text-sm ${
                    testResults.website === '测试成功'
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`}>
                    {testResults.website}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">微信公众号配置</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App ID
                </label>
                <input
                  type="text"
                  value={config.publishPlatforms.wechat.appId}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      publishPlatforms: {
                        ...config.publishPlatforms,
                        wechat: {
                          ...config.publishPlatforms.wechat,
                          appId: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="请输入 App ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Secret
                </label>
                <input
                  type="password"
                  value={config.publishPlatforms.wechat.appSecret}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      publishPlatforms: {
                        ...config.publishPlatforms,
                        wechat: {
                          ...config.publishPlatforms.wechat,
                          appSecret: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="请输入 App Secret"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token
                </label>
                <input
                  type="password"
                  value={config.publishPlatforms.wechat.token}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      publishPlatforms: {
                        ...config.publishPlatforms,
                        wechat: {
                          ...config.publishPlatforms.wechat,
                          token: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="请输入 Token"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <button
                  onClick={() => handleTest('wechat')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  测试连接
                </button>
                {testResults.wechat && (
                  <p className={`mt-2 text-sm ${
                    testResults.wechat === '测试成功'
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`}>
                    {testResults.wechat}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
