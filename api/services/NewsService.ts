import { NewsArticle, UserProfile } from '../../shared/types'
import { AICrawlerService } from './AICrawlerService'

export class NewsService {
  private static newsArticles: NewsArticle[] = []
  private aiCrawlerService: AICrawlerService

  constructor() {
    this.aiCrawlerService = new AICrawlerService()
    // 初始化一些模拟数据
    this.initializeMockData()
  }

  private initializeMockData() {
    NewsService.newsArticles = [
      {
        id: '1',
        title: '人工智能在医疗诊断领域取得重大突破',
        content: '最新研究表明，AI 系统在某些疾病的早期诊断准确率已超过人类医生，为医疗行业带来革命性变化。',
        source: '科技日报',
        url: 'https://example.com/news/1',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        relatedIndustries: ['科技', '医疗'],
        relatedKeywords: ['人工智能', '医疗', '诊断'],
      },
      {
        id: '2',
        title: '新能源汽车销量创历史新高',
        content: '今年第三季度，全球新能源汽车销量同比增长 45%，市场渗透率首次超过 30%。',
        source: '汽车周刊',
        url: 'https://example.com/news/2',
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        relatedIndustries: ['汽车', '新能源'],
        relatedKeywords: ['新能源汽车', '销量', '市场'],
      },
      {
        id: '3',
        title: '云计算市场持续增长，企业数字化转型加速',
        content: '受企业数字化转型需求推动，全球云计算市场预计今年将突破 5000 亿美元大关。',
        source: 'IT 时报',
        url: 'https://example.com/news/3',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        relatedIndustries: ['科技', '云计算'],
        relatedKeywords: ['云计算', '数字化转型', '企业'],
      },
    ]
  }

  // 获取最近新闻
  async getRecentNews(
    userId?: string,
    userProfile?: UserProfile,
    forceRefresh: boolean = false
  ): Promise<NewsArticle[]> {
    // 确保有默认新闻数据
    if (NewsService.newsArticles.length === 0 || forceRefresh) {
      this.initializeMockData()
    }
    
    // 如果是刷新操作，尝试获取新新闻
    if (forceRefresh) {
      try {
        const crawlResult = await this.aiCrawlerService.crawlNews(userProfile, userId)
        if (crawlResult.success && crawlResult.articles.length > 0) {
          NewsService.newsArticles = crawlResult.articles
        }
      } catch (error) {
        console.error('获取新新闻失败，使用默认数据:', error)
      }
    }

    // 返回所有新闻，或者最多6条
    return NewsService.newsArticles.slice(0, 6)
  }

  // 更新新闻抓取结果
  async updateNewsFeeds(userId?: string, userProfile?: UserProfile): Promise<void> {
    console.log('Updating news feeds...')

    try {
      // 使用 AI 爬虫服务更新新闻
      await this.aiCrawlerService.crawlNews(userProfile, userId)
    } catch (error) {
      console.error('更新新闻抓取结果失败:', error)
    }
  }

  // 根据 ID 获取新闻
  async getNewsById(id: string): Promise<NewsArticle | null> {
    return NewsService.newsArticles.find((news: NewsArticle) => news.id === id) || null
  }
}
