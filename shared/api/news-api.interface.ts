import { NewsArticle, UserProfile } from '../types'

// 新闻源配置接口
export interface NewsSourceConfig {
  provider: 'newsapi' | 'guardian' | 'nytimes'
  apiKey: string
  baseUrl?: string
  timeout?: number
}

// 新闻 API 接口
export interface INewsAPI {
  // 获取新闻
  fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]>

  // 测试连接
  testConnection(): Promise<{ success: boolean; message: string }>

  // 获取配置
  getConfig(): NewsSourceConfig

  // 获取新闻源名称
  getName(): string
}

// 新闻 API 响应格式接口
export interface NewsAPIResponse {
  articles?: any[]
  response?: {
    results?: any[]
    docs?: any[]
  }
}

// 新闻适配器抽象类
export abstract class NewsAdapter implements INewsAPI {
  constructor(protected config: NewsSourceConfig) {}

  abstract fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]>

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const articles = await this.fetchNews()
      if (articles.length > 0) {
        return {
          success: true,
          message: `连接成功！获取到 ${articles.length} 条新闻`
        }
      } else {
        return {
          success: false,
          message: '连接成功，但没有获取到新闻'
        }
      }
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? '连接超时，请检查当前网络环境是否允许访问'
          : `连接失败: ${(error as Error).message}`
      return { success: false, message }
    }
  }

  getConfig(): NewsSourceConfig {
    return this.config
  }

  abstract getName(): string

  // 通用的 HTTP 请求方法
  protected async fetchJsonWithTimeout(
    url: string,
    timeoutMs: number = 12000
  ): Promise<{ response: Response; data: any }> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AINews/1.0',
        },
      })

      const data = await response.json().catch(() => null)

      return { response, data }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // 构建查询参数
  protected buildQuery(keywords: string[]): string {
    return keywords.length > 0 ? keywords.join(' OR ') : 'technology'
  }
}