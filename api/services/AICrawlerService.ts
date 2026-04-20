import { NewsArticle, UserProfile } from '../../shared/types'
import { ConfigService } from './ConfigService'

// 爬取结果接口
interface CrawlResult {
  success: boolean
  articles: NewsArticle[]
  error?: string
}

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'ollama'
  apiKey: string
  modelName: string
  baseUrl?: string
}

interface NewsSourceConfig {
  provider: 'newsapi' | 'guardian' | 'nytimes'
  apiKey: string
  baseUrl?: string
}

export class AICrawlerService {
  private crawledArticles: NewsArticle[] = []
  private configService: ConfigService

  constructor() {
    this.configService = new ConfigService()
  }

  // 基于用户兴趣爬取新闻
  async crawlNews(
    userProfile?: UserProfile,
    userId?: string,
    extraKeywords: string[] = []
  ): Promise<CrawlResult> {
    try {
      // 提取用户兴趣关键词，并合并本次对话输入的关键词
      const keywords = this.extractKeywords(userProfile, extraKeywords)
      
      if (keywords.length === 0) {
        return {
          success: false,
          articles: [],
          error: '未找到用户关注的关键词'
        }
      }

      console.log('开始爬取新闻，关键词:', keywords)

      const articles = await this.simulateCrawling(keywords, userId)

      this.crawledArticles = articles
      return {
        success: true,
        articles
      }
    } catch (error) {
      console.error('爬虫执行失败:', error)
      return {
        success: false,
        articles: [],
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  // 提取用户兴趣关键词
  private extractKeywords(userProfile?: UserProfile, extraKeywords: string[] = []): string[] {
    const keywords = new Set<string>()

    // 添加用户设置的关键词
    if (userProfile?.keywords && userProfile.keywords.length > 0) {
      userProfile.keywords.forEach(keyword => keywords.add(keyword))
    }

    // 添加用户关注的行业作为关键词
    if (userProfile?.industries && userProfile.industries.length > 0) {
      userProfile.industries.forEach(industry => keywords.add(industry))
    }

    // 添加本次任务里额外指定的关键词
    extraKeywords
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .forEach((keyword) => keywords.add(keyword))

    // 默认关键词
    if (keywords.size === 0) {
      return ['人工智能', '科技', '财经', '健康']
    }

    return Array.from(keywords)
  }

  private async simulateCrawling(keywords: string[], userId?: string): Promise<NewsArticle[]> {
    const realArticles = await this.fetchRealNews(keywords, userId)

    if (realArticles.length > 0) {
      return realArticles
    }

    throw new Error('未从真实新闻源抓取到相关新闻，请检查新闻源配置或调整关键词')
  }

  // 获取 AI 配置
  private async getAIConfig(userId?: string): Promise<AIConfig> {
    try {
      if (userId) {
        const config = await this.configService.getConfig(userId)
        return {
          provider: config.aiModel.provider as any,
          apiKey: config.aiModel.apiKey,
          modelName: config.aiModel.modelName,
          baseUrl: config.aiModel.baseUrl,
        }
      }
    } catch (error) {
      console.log('获取配置失败，使用默认配置:', error)
    }
    // 如果获取配置失败，使用默认配置
    return {
      provider: 'ollama',
      apiKey: '',
      modelName: 'gemma',
      baseUrl: 'http://localhost:11434',
    }
  }

  private async getNewsSourceConfig(userId?: string): Promise<NewsSourceConfig | null> {
    if (!userId) {
      return null
    }

    try {
      const config = await this.configService.getConfig(userId)
      if (!config.newsAPI?.apiKey) {
        return null
      }

      return {
        provider: config.newsAPI.provider,
        apiKey: config.newsAPI.apiKey,
        baseUrl: config.newsAPI.baseUrl,
      }
    } catch (error) {
      console.error('获取新闻源配置失败:', error)
      return null
    }
  }

  private async fetchRealNews(keywords: string[], userId?: string): Promise<NewsArticle[]> {
    const config = await this.getNewsSourceConfig(userId)

    if (!config) {
      throw new Error('未配置可用的新闻源 API，请先在系统配置中完成新闻源设置')
    }

    if (config.provider === 'newsapi') {
      return this.fetchNewsFromNewsApi(config, keywords)
    }

    throw new Error(`当前新闻源 ${config.provider} 暂未接入真实抓取`)
  }

  private async fetchNewsFromNewsApi(
    config: NewsSourceConfig,
    keywords: string[]
  ): Promise<NewsArticle[]> {
    const baseUrl = (config.baseUrl || 'https://newsapi.org/v2').replace(/\/$/, '')
    const requestUrl = new URL(`${baseUrl}/everything`)
    const query = keywords.slice(0, 6).join(' OR ')

    requestUrl.searchParams.set('q', query)
    requestUrl.searchParams.set('language', 'zh')
    requestUrl.searchParams.set('sortBy', 'publishedAt')
    requestUrl.searchParams.set('pageSize', '10')

    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': config.apiKey,
      },
    })

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const data = isJson ? await response.json() : await response.text()

    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String(data.message)
          : `新闻源请求失败: ${response.status}`
      throw new Error(message)
    }

    const rawArticles =
      typeof data === 'object' && data !== null && 'articles' in data
        ? (data.articles as Array<{
            title?: string
            description?: string
            content?: string
            url?: string
            publishedAt?: string
            source?: { name?: string }
          }>)
        : []

    return rawArticles
      .filter((item) => item.title && item.url)
      .map((item, index) => {
        const summary = (item.description || item.content || '暂无摘要')
          .replace(/\[\+\d+\schars\]$/, '')
          .trim()
        const matchedKeywords = keywords.filter((keyword) =>
          `${item.title} ${summary}`.toLowerCase().includes(keyword.toLowerCase())
        )

        return {
          id: `newsapi_${Date.now()}_${index}`,
          title: item.title || '未命名新闻',
          content: summary,
          source: item.source?.name || 'NewsAPI',
          url: item.url || '',
          publishedAt: item.publishedAt || new Date().toISOString(),
          relatedIndustries: [],
          relatedKeywords: matchedKeywords.length > 0 ? matchedKeywords : keywords.slice(0, 4),
        }
      })
  }

  // 调用 Ollama API 获取推荐新闻
  private async callOllamaForNews(keywords: string[], userId?: string): Promise<NewsArticle[]> {
    const config = await this.getAIConfig(userId)
    const baseUrl = config.baseUrl || 'http://localhost:11434'
    const modelName = config.modelName || 'gemma'
    
    const prompt = `请基于以下关键词为我生成最近的新闻推荐：${keywords.join('、')}。

每个新闻请包含以下信息：
1. 标题
2. 内容摘要
3. 来源
4. 相关行业
5. 相关关键词

请生成至少6条不同的新闻，格式如下：

标题：[新闻标题]
内容：[新闻内容摘要]
来源：[新闻来源]
行业：[相关行业]
关键词：[相关关键词]

示例：

标题：人工智能在医疗领域取得重大突破
内容：近日，AI技术在医疗诊断方面取得重大进展，能够准确识别多种疾病。
来源：科技日报
行业：科技、医疗
关键词：人工智能、医疗、诊断`
    
    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API 调用失败: ${response.status}`)
      }

      const data = await response.json() as { response?: string }
      const responseText = data.response || ''
      
      // 解析 Ollama 返回的新闻
      const articles = this.parseOllamaNewsResponse(responseText)
      if (articles.length === 0) {
        throw new Error('未解析到有效新闻')
      }
      return articles
    } catch (error) {
      console.error('Ollama API 调用错误:', error)
      throw error
    }
  }

  // 解析 Ollama 返回的新闻
  private parseOllamaNewsResponse(responseText: string): NewsArticle[] {
    const articles: NewsArticle[] = []
    const newsBlocks = responseText.split('\n\n')
    
    newsBlocks.forEach((block, index) => {
      if (block.includes('标题：')) {
        const lines = block.split('\n')
        let title = ''
        let content = ''
        let source = 'AI 推荐'
        let industries: string[] = []
        let keywords: string[] = []
        
        lines.forEach(line => {
          if (line.startsWith('标题：')) {
            title = line.replace('标题：', '').trim()
          } else if (line.startsWith('内容：')) {
            content = line.replace('内容：', '').trim()
          } else if (line.startsWith('来源：')) {
            source = line.replace('来源：', '').trim()
          } else if (line.startsWith('行业：')) {
            industries = line.replace('行业：', '').split('、').map(item => item.trim())
          } else if (line.startsWith('关键词：')) {
            keywords = line.replace('关键词：', '').split('、').map(item => item.trim())
          }
        })
        
        if (title && content) {
          articles.push({
            id: `ollama_${index}_${Date.now()}`,
            title,
            content,
            source,
            url: `https://example.com/news/ollama_${index}`,
            publishedAt: new Date().toISOString(),
            relatedIndustries: industries,
            relatedKeywords: keywords
          })
        }
      }
    })
    
    return articles
  }

  // 获取爬取的新闻
  getCrawledNews(): NewsArticle[] {
    return this.crawledArticles
  }

  // 随机获取指定数量的新闻
  getRandomNews(count: number = 6): NewsArticle[] {
    const shuffled = [...this.crawledArticles].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  // 测试爬虫连接（包括 Ollama 模型连通性）
  async testCrawler(): Promise<{ success: boolean; message: string }> {
    try {
      // 测试爬虫功能
      const result = await this.crawlNews(undefined, '1', ['人工智能'])
      return {
        success: result.success,
        message: result.success ? '真实新闻抓取成功' : result.error || '爬虫连接失败'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '测试失败'
      }
    }
  }
}
