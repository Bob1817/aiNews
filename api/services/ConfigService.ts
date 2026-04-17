import { UserConfig } from '../../src/types'

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
          provider: 'openai',
          apiKey: 'sk-...',
          modelName: 'gpt-3.5-turbo',
          baseUrl: '',
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
      return config
    }

    // 如果配置不存在，创建一个新的
    const newConfig: UserConfig = {
      id: Date.now().toString(),
      userId,
      aiModel: {
        provider: 'openai',
        apiKey: '',
        modelName: 'gpt-3.5-turbo',
        baseUrl: '',
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
    config.updatedAt = new Date().toISOString()

    return config
  }
}
