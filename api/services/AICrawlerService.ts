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

export class AICrawlerService {
  private crawledArticles: NewsArticle[] = []
  private configService: ConfigService

  constructor() {
    this.configService = new ConfigService()
  }

  // 基于用户兴趣爬取新闻
  async crawlNews(userProfile?: UserProfile, userId?: string): Promise<CrawlResult> {
    try {
      // 提取用户兴趣关键词
      const keywords = this.extractKeywords(userProfile)
      
      if (keywords.length === 0) {
        return {
          success: false,
          articles: [],
          error: '未找到用户关注的关键词'
        }
      }

      console.log('开始爬取新闻，关键词:', keywords)

      // 模拟爬虫行为 - 实际项目中这里会使用真实的网络爬虫库
      // 例如 Puppeteer、Cheerio 或其他爬虫工具
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
  private extractKeywords(userProfile?: UserProfile): string[] {
    const keywords = new Set<string>()

    // 添加用户设置的关键词
    if (userProfile?.keywords && userProfile.keywords.length > 0) {
      userProfile.keywords.forEach(keyword => keywords.add(keyword))
    }

    // 添加用户关注的行业作为关键词
    if (userProfile?.industries && userProfile.industries.length > 0) {
      userProfile.industries.forEach(industry => keywords.add(industry))
    }

    // 默认关键词
    if (keywords.size === 0) {
      return ['人工智能', '科技', '财经', '健康']
    }

    return Array.from(keywords)
  }

  // 使用 Ollama Gemma 模型获取推荐新闻
  private async simulateCrawling(keywords: string[], userId?: string): Promise<NewsArticle[]> {
    try {
      // 调用 Ollama API 获取推荐新闻
      const articles = await this.callOllamaForNews(keywords, userId)
      return articles
    } catch (error) {
      console.error('使用 Ollama 获取新闻失败，使用模拟数据:', error)
      // 失败时使用模拟数据
      return this.generateMockNews(keywords)
    }
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

  // 生成模拟新闻数据
  private generateMockNews(keywords: string[]): NewsArticle[] {
    const mockArticles: NewsArticle[] = []
    const sources = ['科技日报', '财经时报', '健康杂志', '汽车周刊', 'IT 时报']
    const industries = ['科技', '财经', '健康', '汽车', '教育']

    // 为每个关键词生成一些新闻
    keywords.forEach((keyword, index) => {
      for (let i = 0; i < 2; i++) {
        const id = `${index}_${i}_${Date.now()}`
        const source = sources[Math.floor(Math.random() * sources.length)]
        const relatedIndustries = [industries[Math.floor(Math.random() * industries.length)]]
        
        mockArticles.push({
          id,
          title: `${keyword}领域${i + 1}月最新动态`,
          content: `近日，${keyword}领域迎来重要发展。据报道，相关企业在${keyword}技术方面取得重大突破，预计将对行业产生深远影响。专家表示，这一发展将推动${keyword}领域的创新与应用。`,
          source,
          url: `https://example.com/news/${id}`,
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          relatedIndustries,
          relatedKeywords: [keyword, ...relatedIndustries]
        })
      }
    })

    // 随机打乱新闻顺序
    return mockArticles.sort(() => Math.random() - 0.5)
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
      // 测试 Ollama 模型连通性
      const ollamaTest = await this.testOllamaConnection()
      if (!ollamaTest.success) {
        return ollamaTest
      }

      // 测试爬虫功能
      const result = await this.crawlNews()
      return {
        success: result.success,
        message: result.success ? '爬虫连接成功' : result.error || '爬虫连接失败'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '测试失败'
      }
    }
  }

  // 测试 Ollama 模型连通性
  private async testOllamaConnection(): Promise<{ success: boolean; message: string }> {
    const baseUrl = 'http://localhost:11434'
    
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Ollama API 调用失败: ${response.status}`)
      }

      const data = await response.json() as { models?: Array<{ name: string }> }
      
      // 检查模型是否存在
      const hasGemmaModel = data.models?.some(model => model.name.includes('gemma'))
      if (!hasGemmaModel) {
        return {
          success: false,
          message: '未找到 gemma 模型，请确保已在 Ollama 中安装 gemma 模型'
        }
      }

      return {
        success: true,
        message: 'Ollama gemma 模型连接成功'
      }
    } catch (error) {
      console.error('Ollama 连接测试错误:', error)
      return {
        success: false,
        message: 'Ollama 服务不可用，请确保 Ollama 正在运行并安装了 gemma 模型'
      }
    }
  }
}
