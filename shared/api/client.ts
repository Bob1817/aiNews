import { configUtils } from '../../shared/config'
import { ErrorHandler, ExternalApiError } from '../../shared/errors'

// API 响应接口
export interface ApiResponse<T = any> {
  data: T
  status: number
  headers: Record<string, string>
}

// API 请求配置
export interface ApiRequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  body?: any
  timeout?: number
  retries?: number
}

// API 客户端错误
export class ApiClientError extends ExternalApiError {
  constructor(
    message: string,
    public service: string,
    public url: string,
    public status?: number,
    originalError?: Error
  ) {
    super(message, service, originalError)
    this.name = 'ApiClientError'
  }
}

// 基础 API 客户端
export class ApiClient {
  private defaultHeaders: Record<string, string>
  private defaultTimeout: number

  constructor(
    private serviceName: string,
    private baseConfig: Partial<ApiRequestConfig> = {}
  ) {
    this.defaultHeaders = {
      'User-Agent': 'AINews/1.0',
      'Content-Type': 'application/json',
      ...baseConfig.headers,
    }

    this.defaultTimeout = baseConfig.timeout || configUtils.getConfig().api.timeout
  }

  // 发送请求
  async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const {
      url,
      method = 'GET',
      headers = {},
      params = {},
      body,
      timeout = this.defaultTimeout,
      retries = configUtils.getConfig().newsApi.maxRetries,
    } = config

    // 构建完整 URL
    const fullUrl = this.buildUrl(url, params)

    // 合并请求头
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    }

    // 使用重试策略发送请求
    return ErrorHandler.withRetry(
      async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        try {
          const response = await fetch(fullUrl, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          })

          const responseData = await this.parseResponse(response)

          if (!response.ok) {
            throw new ApiClientError(
              `API 请求失败: ${response.status}`,
              this.serviceName,
              fullUrl,
              response.status,
              new Error(responseData?.message || 'Unknown error')
            )
          }

          return {
            data: responseData,
            status: response.status,
            headers: this.extractHeaders(response),
          }
        } finally {
          clearTimeout(timeoutId)
        }
      },
      retries,
      1000, // 初始延迟 1秒
      `${this.serviceName} API 请求`
    )
  }

  // GET 请求
  async get<T = any>(
    url: string,
    params?: Record<string, string | number | boolean>,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'GET',
      params,
      ...config,
    })
  }

  // POST 请求
  async post<T = any>(
    url: string,
    body?: any,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      body,
      ...config,
    })
  }

  // 构建 URL
  private buildUrl(baseUrl: string, params: Record<string, string | number | boolean>): string {
    const url = new URL(baseUrl)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    return url.toString()
  }

  // 解析响应
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      try {
        return await response.json()
      } catch (error) {
        // 如果 JSON 解析失败，尝试解析为文本
        const text = await response.text()
        console.warn(`JSON 解析失败，原始响应: ${text.substring(0, 200)}`)
        return text
      }
    }

    return response.text()
  }

  // 提取响应头
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  }

  // 创建特定服务的 API 客户端
  static createNewsApiClient(apiKey: string, baseUrl?: string): ApiClient {
    return new ApiClient('NewsAPI', {
      baseUrl: baseUrl || 'https://newsapi.org/v2',
      headers: {
        'X-Api-Key': apiKey,
      },
    })
  }

  static createGuardianApiClient(apiKey: string, baseUrl?: string): ApiClient {
    return new ApiClient('The Guardian', {
      baseUrl: baseUrl || 'https://content.guardianapis.com',
    })
  }

  static createNYTApiClient(apiKey: string, baseUrl?: string): ApiClient {
    return new ApiClient('New York Times', {
      baseUrl: baseUrl || 'https://api.nytimes.com/svc/search/v2',
    })
  }
}

// 新闻 API 响应类型
export interface NewsApiArticle {
  title?: string
  description?: string
  content?: string
  url?: string
  publishedAt?: string
  source?: {
    name?: string
  }
}

export interface GuardianApiArticle {
  webTitle?: string
  fields?: {
    headline?: string
    trailText?: string
    webUrl?: string
    publicationDate?: string
  }
  webUrl?: string
  webPublicationDate?: string
}

export interface NYTApiArticle {
  headline?: {
    main?: string
  }
  abstract?: string
  web_url?: string
  pub_date?: string
  source?: string
}

// 新闻 API 适配器
export class NewsApiAdapter {
  constructor(private apiClient: ApiClient) {}

  // 获取头条新闻
  async getTopHeadlines(params: {
    country?: string
    category?: string
    q?: string
    pageSize?: number
    page?: number
  }): Promise<NewsApiArticle[]> {
    const response = await this.apiClient.get<{
      articles: NewsApiArticle[]
      totalResults?: number
      status?: string
    }>('/top-headlines', params)

    return response.data.articles || []
  }

  // 搜索新闻
  async searchEverything(params: {
    q: string
    from?: string
    to?: string
    language?: string
    sortBy?: string
    pageSize?: number
    page?: number
  }): Promise<NewsApiArticle[]> {
    const response = await this.apiClient.get<{
      articles: NewsApiArticle[]
      totalResults?: number
      status?: string
    }>('/everything', params)

    return response.data.articles || []
  }
}

// Guardian API 适配器
export class GuardianApiAdapter {
  constructor(private apiClient: ApiClient) {}

  // 搜索内容
  async searchContent(params: {
    q: string
    'show-fields'?: string
    'page-size'?: number
    page?: number
    'from-date'?: string
    'to-date'?: string
    section?: string
  }): Promise<GuardianApiArticle[]> {
    const response = await this.apiClient.get<{
      response?: {
        results?: GuardianApiArticle[]
        total?: number
        pages?: number
      }
    }>('/search', {
      ...params,
      'api-key': this.getApiKeyFromClient(),
    })

    return response.data.response?.results || []
  }

  // 从客户端获取 API 密钥
  private getApiKeyFromClient(): string {
    // 从客户端配置中提取 API 密钥
    const config = this.apiClient as any
    return config.baseConfig?.headers?.['api-key'] || ''
  }
}

// NYT API 适配器
export class NYTApiAdapter {
  constructor(private apiClient: ApiClient) {}

  // 文章搜索
  async articleSearch(params: {
    q: string
    fl?: string
    fq?: string
    sort?: string
    page?: number
    begin_date?: string
    end_date?: string
  }): Promise<NYTApiArticle[]> {
    const response = await this.apiClient.get<{
      response?: {
        docs?: NYTApiArticle[]
        meta?: {
          hits?: number
          offset?: number
          time?: number
        }
      }
    }>('/articlesearch.json', params)

    return response.data.response?.docs || []
  }
}

// 导出所有 API 客户端和适配器
export default {
  ApiClient,
  ApiClientError,
  NewsApiAdapter,
  GuardianApiAdapter,
  NYTApiAdapter,
}