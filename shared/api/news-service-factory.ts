import { NewsArticle, UserProfile } from '../types'
import { INewsAPI, NewsSourceConfig } from './news-api.interface'
import { NewsAPIAdapter, GuardianAPIAdapter, NYTAPIAdapter } from './news-adapters'

// 新闻服务工厂类
export class NewsServiceFactory {
  // 创建新闻 API 实例
  static createNewsAPI(config: NewsSourceConfig): INewsAPI {
    switch (config.provider) {
      case 'newsapi':
        return new NewsAPIAdapter(config)
      case 'guardian':
        return new GuardianAPIAdapter(config)
      case 'nytimes':
        return new NYTAPIAdapter(config)
      default:
        throw new Error(`不支持的新闻源: ${config.provider}`)
    }
  }

  // 获取所有支持的新闻源
  static getSupportedProviders(): Array<{
    id: 'newsapi' | 'guardian' | 'nytimes'
    name: string
    description: string
  }> {
    return [
      {
        id: 'newsapi',
        name: 'NewsAPI',
        description: '聚合全球新闻源，覆盖广泛'
      },
      {
        id: 'guardian',
        name: 'The Guardian',
        description: '英国卫报新闻，国际视角'
      },
      {
        id: 'nytimes',
        name: 'New York Times',
        description: '纽约时报，深度报道'
      }
    ]
  }

  // 批量获取新闻（从多个源）
  static async fetchNewsFromMultipleSources(
    configs: NewsSourceConfig[],
    userProfile?: UserProfile
  ): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = []
    const errors: string[] = []

    // 并行获取所有新闻源
    const promises = configs.map(async (config) => {
      try {
        const api = this.createNewsAPI(config)
        const articles = await api.fetchNews(userProfile)
        return { success: true, articles }
      } catch (error) {
        errors.push(`${config.provider}: ${(error as Error).message}`)
        return { success: false, articles: [] }
      }
    })

    const results = await Promise.all(promises)

    // 合并所有成功获取的文章
    results.forEach((result) => {
      if (result.success) {
        allArticles.push(...result.articles)
      }
    })

    // 按发布时间排序（最新的在前）
    allArticles.sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    // 如果有错误，记录到控制台
    if (errors.length > 0) {
      console.warn('部分新闻源获取失败:', errors)
    }

    return allArticles
  }

  // 测试多个新闻源连接
  static async testMultipleSources(configs: NewsSourceConfig[]): Promise<
    Array<{
      provider: string
      success: boolean
      message: string
    }>
  > {
    const results = await Promise.all(
      configs.map(async (config) => {
        try {
          const api = this.createNewsAPI(config)
          const testResult = await api.testConnection()
          return {
            provider: config.provider,
            success: testResult.success,
            message: testResult.message
          }
        } catch (error) {
          return {
            provider: config.provider,
            success: false,
            message: `测试失败: ${(error as Error).message}`
          }
        }
      })
    )

    return results
  }

  // 获取默认配置
  static getDefaultConfig(provider: 'newsapi' | 'guardian' | 'nytimes'): NewsSourceConfig {
    const defaultConfigs: Record<typeof provider, NewsSourceConfig> = {
      newsapi: {
        provider: 'newsapi',
        apiKey: '',
        baseUrl: 'https://newsapi.org/v2',
        timeout: 12000
      },
      guardian: {
        provider: 'guardian',
        apiKey: '',
        baseUrl: 'https://content.guardianapis.com',
        timeout: 12000
      },
      nytimes: {
        provider: 'nytimes',
        apiKey: '',
        baseUrl: 'https://api.nytimes.com/svc/search/v2',
        timeout: 12000
      }
    }

    return defaultConfigs[provider]
  }
}