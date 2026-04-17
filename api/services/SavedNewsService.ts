import { SavedNews } from '../../src/types'

export class SavedNewsService {
  private static savedNews: SavedNews[] = []

  constructor() {
    // 初始化一些模拟数据
    if (SavedNewsService.savedNews.length === 0) {
      this.initializeMockData()
    }
  }

  private initializeMockData() {
    SavedNewsService.savedNews = [
      {
        id: '1',
        userId: '1',
        title: 'AI 医疗诊断技术引领行业变革',
        content: '在当今快速发展的科技领域，人工智能技术正在医疗行业掀起一场革命性的变革...',
        originalNewsId: '1',
        isPublished: true,
        publishedTo: ['website'],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        userId: '1',
        title: '新能源汽车市场分析报告',
        content: '随着全球环保意识的提升和政策支持，新能源汽车市场正在经历爆发式增长...',
        originalNewsId: '2',
        isPublished: false,
        publishedTo: [],
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ]
  }

  // 获取保存的新闻
  async getSavedNews(userId: string): Promise<SavedNews[]> {
    return SavedNewsService.savedNews.filter((news) => news.userId === userId)
  }

  // 保存新闻
  async saveNews(data: {
    userId: string
    title: string
    content: string
    originalNewsId?: string
    categories?: string[]
    industries?: string[]
  }): Promise<SavedNews> {
    const newNews: SavedNews = {
      id: Date.now().toString(),
      userId: data.userId,
      title: data.title,
      content: data.content,
      originalNewsId: data.originalNewsId,
      isPublished: false,
      publishedTo: [],
      categories: data.categories || [],
      industries: data.industries || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    SavedNewsService.savedNews.push(newNews)
    return newNews
  }

  // 更新新闻
  async updateNews(id: string, data: {
    title?: string
    content?: string
    categories?: string[]
    industries?: string[]
  }): Promise<SavedNews> {
    const news = SavedNewsService.savedNews.find((news) => news.id === id)
    if (!news) {
      throw new Error('新闻不存在')
    }

    if (data.title) news.title = data.title
    if (data.content) news.content = data.content
    if (data.categories !== undefined) news.categories = data.categories
    if (data.industries !== undefined) news.industries = data.industries
    news.updatedAt = new Date().toISOString()

    return news
  }

  // 根据 ID 获取新闻
  async getSavedNewsById(id: string): Promise<SavedNews | null> {
    return SavedNewsService.savedNews.find((news) => news.id === id) || null
  }

  // 更新发布状态
  async updatePublishStatus(id: string, platforms: string[]): Promise<SavedNews> {
    const news = SavedNewsService.savedNews.find((news) => news.id === id)
    if (!news) {
      throw new Error('新闻不存在')
    }

    news.isPublished = true
    news.publishedTo = [...new Set([...news.publishedTo, ...platforms])]
    news.updatedAt = new Date().toISOString()

    return news
  }
}
