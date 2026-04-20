import { UserConfig } from '../../shared/types'

export class ConfigService {
  private static userConfigs: UserConfig[] = []

  constructor() {
    // 初始化一些模拟数据
    if (ConfigService.userConfigs.length === 0) {
      this.initializeMockData()
    }
  }

  private initializeMockData() {
    ConfigService.userConfigs = [
      {
        id: '1',
        userId: '1',
        aiModel: {
          id: '',
          name: '',
          provider: 'ollama',
          apiKey: '',
          modelName: '',
          baseUrl: '',
        },
        aiModels: [],
        newsAPI: {
          provider: 'newsapi',
          apiKey: process.env.NEWSAPI_API_KEY || '70803be67f5d4647b6e54a35f0615d25',
          baseUrl: 'https://newsapi.org/v2',
        },
        publishPlatforms: {
          website: {
            apiUrl: 'https://api.example.com/news',
            apiKey: 'api_key_123',
          },
          wechat: {
            appId: 'wx1234567890',
            appSecret: 'secret_123',
            token: 'token_123',
          },
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]
  }

  // 获取配置
  async getConfig(userId: string): Promise<UserConfig> {
    const config = ConfigService.userConfigs.find((c) => c.userId === userId)
    if (config) {
      // 确保有默认的 NewsAPI 配置
      if (!config.newsAPI) {
        config.newsAPI = {
          provider: 'newsapi',
          apiKey: process.env.NEWSAPI_API_KEY || '70803be67f5d4647b6e54a35f0615d25',
          baseUrl: 'https://newsapi.org/v2',
        }
        config.updatedAt = new Date().toISOString()
      }
      // 确保 aiModel 对象存在
      if (!config.aiModel) {
        config.aiModel = {
          id: '',
          name: '',
          provider: 'ollama',
          apiKey: '',
          modelName: '',
          baseUrl: '',
        }
        config.updatedAt = new Date().toISOString()
      }
      // 确保 aiModels 数组存在
      if (!config.aiModels) {
        config.aiModels = []
        config.updatedAt = new Date().toISOString()
      }
      return config
    }

    // 如果配置不存在，创建一个新的（包含默认的 NewsAPI 配置）
    const newConfig: UserConfig = {
      id: Date.now().toString(),
      userId,
      aiModel: {
        id: '',
        name: '',
        provider: 'ollama',
        apiKey: '',
        modelName: '',
        baseUrl: '',
      },
      aiModels: [],
      newsAPI: {
        provider: 'newsapi',
        apiKey: process.env.NEWSAPI_API_KEY || '70803be67f5d4647b6e54a35f0615d25',
        baseUrl: 'https://newsapi.org/v2',
      },
      publishPlatforms: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    ConfigService.userConfigs.push(newConfig)
    return newConfig
  }

  // 保存配置
  async saveConfig(userId: string, configData: any): Promise<UserConfig> {
    const config = ConfigService.userConfigs.find((c) => c.userId === userId)
    if (!config) {
      throw new Error('配置不存在')
    }

    if (configData.aiModel) {
      config.aiModel = { ...config.aiModel, ...configData.aiModel }
    }
    if (configData.newsAPI) {
      config.newsAPI = { ...config.newsAPI, ...configData.newsAPI }
    }
    if (configData.publishPlatforms) {
      config.publishPlatforms = { ...config.publishPlatforms, ...configData.publishPlatforms }
    }
    if (configData.aiModels) {
      // 检查是否是第一次保存模型
      const isFirstModel = config.aiModels.length === 0 && configData.aiModels.length === 1
      
      config.aiModels = configData.aiModels.map((model: any) => ({
        ...model,
        isActive: isFirstModel || model.id === config.aiModel.id,
      }))
    }

    const activeModel =
      config.aiModels.find((model) => model.isActive) ||
      config.aiModels.find((model) => model.id === config.aiModel.id)

    if (activeModel) {
      config.aiModel = {
        id: activeModel.id,
        name: activeModel.name,
        provider: activeModel.provider,
        apiKey: activeModel.apiKey,
        modelName: activeModel.modelName,
        baseUrl: activeModel.baseUrl,
      }
    }
    config.updatedAt = new Date().toISOString()

    return config
  }

  // 切换 AI 模型
  async switchAIModel(userId: string, modelId: string): Promise<UserConfig> {
    const config = ConfigService.userConfigs.find((c) => c.userId === userId)
    if (!config) {
      throw new Error('配置不存在')
    }

    if (!config.aiModels) {
      config.aiModels = []
    }

    const model = config.aiModels.find((m) => m.id === modelId)
    if (!model) {
      throw new Error('模型不存在')
    }

    config.aiModels = config.aiModels.map((item) => ({
      ...item,
      isActive: item.id === modelId,
    }))

    config.aiModel = {
      id: model.id,
      name: model.name,
      provider: model.provider,
      apiKey: model.apiKey,
      modelName: model.modelName,
      baseUrl: model.baseUrl,
    }

    config.updatedAt = new Date().toISOString()
    return config
  }

  // 删除 AI 模型
  async deleteAIModel(userId: string, modelId: string): Promise<UserConfig> {
    const config = ConfigService.userConfigs.find((c) => c.userId === userId)
    if (!config) {
      throw new Error('配置不存在')
    }

    if (!config.aiModels) {
      config.aiModels = []
    }

    const wasActive = config.aiModel.id === modelId
    config.aiModels = config.aiModels.filter((m) => m.id !== modelId)

    if (wasActive && config.aiModels.length > 0) {
      const nextModel = config.aiModels[0]
      config.aiModels = config.aiModels.map((model) => ({
        ...model,
        isActive: model.id === nextModel.id,
      }))
      config.aiModel = {
        id: nextModel.id,
        name: nextModel.name,
        provider: nextModel.provider,
        apiKey: nextModel.apiKey,
        modelName: nextModel.modelName,
        baseUrl: nextModel.baseUrl,
      }
    }

    config.updatedAt = new Date().toISOString()
    return config
  }
}
