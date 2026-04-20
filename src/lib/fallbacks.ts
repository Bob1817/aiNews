import type { ConversationMessage, NewsArticle, NewsCategory, SavedNews, UserConfig } from '@/types'

export function getDefaultCategories(): NewsCategory[] {
  const now = new Date().toISOString()

  return [
    { id: '1', name: '科技', description: '科技相关新闻', createdAt: now, updatedAt: now },
    { id: '2', name: '财经', description: '财经相关新闻', createdAt: now, updatedAt: now },
    { id: '3', name: '体育', description: '体育相关新闻', createdAt: now, updatedAt: now },
    { id: '4', name: '娱乐', description: '娱乐相关新闻', createdAt: now, updatedAt: now },
  ]
}

export function getMockNewsArticles(): NewsArticle[] {
  return [
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

export function getMockSavedNews(): SavedNews[] {
  return [
    {
      id: '1',
      userId: '1',
      title: 'AI 医疗诊断技术引领行业变革',
      content: '在当今快速发展的科技领域，人工智能技术正在医疗行业掀起一场革命性的变革...',
      originalNewsId: '1',
      url: 'https://example.com/news/1',
      isPublished: true,
      publishedTo: ['website'],
      industries: ['科技', '医疗'],
      categories: ['1'],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      userId: '1',
      title: '新能源汽车市场分析报告',
      content: '随着全球环保意识的提升和政策支持，新能源汽车市场正在经历爆发式增长...',
      originalNewsId: '2',
      url: 'https://example.com/news/2',
      isPublished: false,
      publishedTo: [],
      industries: ['汽车', '新能源'],
      categories: ['1', '2'],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      userId: '1',
      title: '云计算市场持续增长',
      content: '受企业数字化转型需求推动，全球云计算市场预计今年将突破 5000 亿美元大关...',
      originalNewsId: '3',
      url: 'https://example.com/news/3',
      isPublished: true,
      publishedTo: ['website', 'wechat'],
      industries: ['科技', '云计算'],
      categories: ['1'],
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

export function getMockChatResponse(selectedNews: NewsArticle | null): ConversationMessage {
  return {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: selectedNews
      ? `基于您引用的新闻"${selectedNews.title}"，我为您创作了一篇新闻稿...\n\n这是一篇关于${selectedNews.relatedKeywords.join('、')}的深度报道...`
      : '您好！我是 AI 新闻助手。您可以从上方选择新闻引用，然后让我帮您进行二次创作。',
    timestamp: new Date().toISOString(),
  }
}

export function getDefaultInterests() {
  return {
    industries: ['科技', '医疗', '汽车', '新能源'],
    keywords: ['人工智能', '医疗诊断', '新能源汽车', '云计算', '数字化转型'],
  }
}

export function getDefaultConfigForm(): {
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
} {
  return {
    aiModel: {
      id: 'default',
      name: '默认模型',
      provider: 'openai',
      apiKey: '',
      modelName: 'gpt-3.5-turbo',
      baseUrl: '',
    },
    newsAPI: {
      provider: 'newsapi',
      apiKey: '',
      baseUrl: '',
    },
    publishPlatforms: {
      website: {
        apiUrl: '',
        apiKey: '',
      },
      wechat: {
        appId: '',
        appSecret: '',
        token: '',
      },
    },
  }
}

export function getMockConfigForm() {
  return {
    aiModel: {
      id: 'default',
      name: '默认模型',
      provider: 'openai' as const,
      apiKey: 'sk-...',
      modelName: 'gpt-3.5-turbo',
      baseUrl: '',
    },
    newsAPI: {
      provider: 'newsapi' as const,
      apiKey: '',
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
  }
}
