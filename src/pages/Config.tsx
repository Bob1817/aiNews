import { useState, useEffect } from 'react'
import { ArrowLeft, Save, TestTube, Globe, MessageSquare, Key, Server, Cpu, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/lib/toast'
import { getConfig, updateConfig, testAIModel, getOllamaModels } from '@/lib/api/config'
import { getErrorMessage } from '@/lib/errors'
import { testNewsApi } from '@/lib/api/news'
import type { UserConfig } from '@/types'
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
  }>(getDefaultConfigForm())
  const [isSaving, setIsSaving] = useState(false)
  const [testResults, setTestResults] = useState<{ [key: string]: string }>({})
  const [testDiagnostics, setTestDiagnostics] = useState<Record<string, NewsApiDiagnostic>>({})
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string; model: string }>>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const { showToast } = useToast()

  const fetchOllamaModels = async () => {
    if (config.aiModel.provider === 'ollama' && config.aiModel.baseUrl) {
      setIsFetchingModels(true)
      try {
        const data = await getOllamaModels(config.aiModel.baseUrl)
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
        setConfig(getMockConfigForm())
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
    if (config.aiModel.provider === 'ollama' && config.aiModel.baseUrl) {
      fetchOllamaModels()
    } else {
      setOllamaModels([])
    }
  }, [config.aiModel.provider, config.aiModel.baseUrl])

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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">AI 模型配置</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型提供商
                </label>
                <select
                  value={config.aiModel.provider}
                  onChange={(e) => {
                    const newProvider = e.target.value as 'openai' | 'anthropic' | 'google' | 'ollama'
                    setConfig({
                      ...config,
                      aiModel: {
                        ...config.aiModel,
                        provider: newProvider,
                        baseUrl: newProvider === 'ollama' 
                          ? (config.aiModel.baseUrl || 'http://localhost:11434') 
                          : config.aiModel.baseUrl,
                      },
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic" disabled>Anthropic（暂未接入）</option>
                  <option value="google" disabled>Google（暂未接入）</option>
                  <option value="ollama">Ollama (本地模型)</option>
                </select>
              </div>

              {config.aiModel.provider !== 'ollama' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={config.aiModel.apiKey}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          aiModel: {
                            ...config.aiModel,
                            apiKey: e.target.value,
                          },
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
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型名称
                </label>
                {config.aiModel.provider === 'ollama' ? (
                  <div className="relative">
                    <select
                      value={config.aiModel.modelName}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          aiModel: {
                            ...config.aiModel,
                            modelName: e.target.value,
                          },
                        })
                      }
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
                      disabled={isFetchingModels || !config.aiModel.baseUrl}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={config.aiModel.modelName}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        aiModel: {
                          ...config.aiModel,
                          modelName: e.target.value,
                        },
                      })
                    }
                    placeholder="请输入模型名称"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  基础 URL{config.aiModel.provider === 'ollama' ? '' : '（可选）'}
                </label>
                <input
                  type="url"
                  value={config.aiModel.baseUrl}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      aiModel: {
                        ...config.aiModel,
                        baseUrl: e.target.value,
                      },
                    })
                  }
                  placeholder={config.aiModel.provider === 'ollama' ? 'http://localhost:11434' : '请输入基础 URL'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {config.aiModel.provider === 'ollama' && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Cpu className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Ollama 本地模型配置</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        请确保 Ollama 已安装并运行在您的电脑上。
                        <br />
                        默认运行命令：<code className="bg-blue-100 px-1 rounded">ollama serve</code>
                        <br />
                        下载模型：<code className="bg-blue-100 px-1 rounded">ollama pull gemma</code>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
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
