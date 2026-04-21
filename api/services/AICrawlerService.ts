import { NewsArticle, UserProfile } from '../../shared/types'

interface CrawlResult {
  success: boolean
  articles: NewsArticle[]
  error?: string
}

interface RssCandidate {
  title: string
  link: string
  description: string
  source: string
  publishedAt: string
}

export class AICrawlerService {
  private crawledArticles: NewsArticle[] = []
  private readonly keywordStopwords = new Set([
    '新闻',
    '资讯',
    '相关',
    '相关新闻',
    '推送',
    '推送一些',
    '一些',
    '帮我',
    '帮我看',
    '帮我找',
    '给我',
    '看看',
    '获取',
    '抓取',
    '搜索',
    '查找',
    '检索',
    '最新',
    '今天',
    '最近',
    '一下',
    '内容',
    '消息',
    '方向',
    '领域',
    '行业',
    '技术',
    '应用',
  ])

  private readonly rssSources = [
    {
      name: 'IT之家',
      buildUrl: (_query: string) => 'https://www.ithome.com/rss/',
    },
    {
      name: '36氪',
      buildUrl: (_query: string) => 'https://36kr.com/feed',
    },
    {
      name: 'InfoQ 中文',
      buildUrl: (_query: string) => 'https://www.infoq.cn/feed',
    },
  ]

  async crawlNews(
    userProfile?: UserProfile,
    _userId?: string,
    extraKeywords: string[] = []
  ): Promise<CrawlResult> {
    try {
      const keywords = this.extractKeywords(userProfile, extraKeywords)

      if (keywords.length === 0) {
        return {
          success: false,
          articles: [],
          error: '未找到可用于抓取新闻的关键词',
        }
      }

      const articles = await this.fetchPublicNews(keywords)
      this.crawledArticles = articles

      return {
        success: true,
        articles,
      }
    } catch (error) {
      console.error('AI 爬虫执行失败:', error)
      return {
        success: false,
        articles: [],
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  private normalizeKeywords(keywords: string[]) {
    return Array.from(
      new Set(
        keywords
          .map((keyword) => keyword.trim())
          .filter(Boolean)
          .map((keyword) => keyword.replace(/[，。；、/|]+/g, ' ').replace(/\s+/g, ' ').trim())
          .flatMap((keyword) => keyword.split(' '))
          .map((keyword) => keyword.trim())
          .filter((keyword) => keyword.length >= 2 && keyword.length <= 24)
          .filter((keyword) => !this.keywordStopwords.has(keyword.toLowerCase()))
      )
    ).slice(0, 8)
  }

  private extractKeywords(userProfile?: UserProfile, extraKeywords: string[] = []): string[] {
    const normalizedExtraKeywords = this.normalizeKeywords(extraKeywords)
    if (normalizedExtraKeywords.length > 0) {
      return normalizedExtraKeywords
    }

    const keywords = new Set<string>()

    userProfile?.keywords?.forEach((keyword) => keywords.add(keyword))
    userProfile?.industries?.forEach((industry) => keywords.add(industry))

    if (keywords.size === 0) {
      return ['人工智能', '科技', '财经', '健康']
    }

    return this.normalizeKeywords(Array.from(keywords))
  }

  private async fetchPublicNews(keywords: string[]): Promise<NewsArticle[]> {
    const settled = await Promise.allSettled(
      this.rssSources.map((source) => this.fetchFromRssSource(source.name, source.buildUrl(''), keywords))
    )

    const articles = settled
      .filter((result): result is PromiseFulfilledResult<NewsArticle[]> => result.status === 'fulfilled')
      .flatMap((result) => result.value)

    if (articles.length > 0) {
      return this.dedupeArticles(articles).slice(0, 12)
    }

    const errors = settled
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => (result.reason instanceof Error ? result.reason.message : '未知抓取错误'))

    throw new Error(errors[0] || '公开互联网新闻抓取失败，请稍后重试')
  }

  private async fetchFromRssSource(sourceName: string, url: string, keywords: string[]) {
    let response: Response

    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Assistant-NewsCrawler/1.0)',
          Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知网络错误'
      throw new Error(`${sourceName} 抓取失败（${message}）`)
    }

    if (!response.ok) {
      throw new Error(`${sourceName} 抓取失败（HTTP ${response.status}）`)
    }

    const xml = await response.text()
    const candidates = this.parseRssItems(xml, sourceName)

    return candidates
      .filter((item) => this.matchesKeywords(item, keywords))
      .map((item, index) => this.toArticle(item, keywords, sourceName, index))
  }

  private parseRssItems(xml: string, sourceName: string): RssCandidate[] {
    const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || []

    return items.map((item, index) => {
      const title = this.extractTag(item, 'title') || `${sourceName} 新闻 ${index + 1}`
      const description = this.cleanHtml(this.extractTag(item, 'description') || this.extractTag(item, 'content:encoded') || '')
      const rawLink = this.extractTag(item, 'link') || ''
      const guid = this.extractTag(item, 'guid') || ''
      const pubDate = this.extractTag(item, 'pubDate') || this.extractTag(item, 'published') || ''

      return {
        title: this.decodeHtml(title),
        description: this.decodeHtml(description).trim() || '暂无摘要',
        link: this.normalizeLink(rawLink || guid),
        source: sourceName,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      }
    }).filter((item) => item.link)
  }

  private extractTag(content: string, tagName: string) {
    const match = content.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'))
    return match?.[1]?.trim() || ''
  }

  private cleanHtml(value: string) {
    return value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private decodeHtml(value: string) {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&nbsp;/g, ' ')
  }

  private normalizeLink(link: string) {
    const trimmed = this.decodeHtml(link).trim()
    if (!trimmed) {
      return ''
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }

    return ''
  }

  private matchesKeywords(item: RssCandidate, keywords: string[]) {
    const haystack = `${item.title} ${item.description}`.toLowerCase()
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
  }

  private toArticle(item: RssCandidate, keywords: string[], sourceName: string, index: number): NewsArticle {
    const matchedKeywords = keywords.filter((keyword) =>
      `${item.title} ${item.description}`.toLowerCase().includes(keyword.toLowerCase())
    )

    return {
      id: `${sourceName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${index}`,
      title: item.title,
      content: item.description,
      source: item.source,
      url: item.link,
      publishedAt: item.publishedAt,
      relatedIndustries: [],
      relatedKeywords: matchedKeywords.length > 0 ? matchedKeywords : keywords.slice(0, 4),
    }
  }

  private dedupeArticles(articles: NewsArticle[]) {
    const seen = new Set<string>()
    return articles.filter((article) => {
      const key = `${article.title}::${article.url}`.toLowerCase()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  async fetchArticleContent(url: string, fallbackContent: string = ''): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Assistant-NewsCrawler/1.0)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()
      const normalizedHtml = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')

      const articleScoped =
        normalizedHtml.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ||
        normalizedHtml.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ||
        normalizedHtml

      const paragraphMatches = articleScoped.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || []
      const paragraphs = paragraphMatches
        .map((paragraph) => this.decodeHtml(this.cleanHtml(paragraph)))
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length >= 18)

      const articleText = paragraphs.slice(0, 40).join('\n\n').trim()

      if (articleText.length >= 120) {
        return articleText
      }

      const metaDescription =
        normalizedHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        normalizedHtml.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        ''

      const cleanedMeta = this.decodeHtml(metaDescription).trim()
      if (cleanedMeta.length >= 40) {
        return cleanedMeta
      }

      return fallbackContent
    } catch (error) {
      console.warn('抓取新闻原文失败，回退到摘要内容:', error)
      return fallbackContent
    }
  }

  getCrawledNews(): NewsArticle[] {
    return this.crawledArticles
  }

  getRandomNews(count: number = 6): NewsArticle[] {
    const shuffled = [...this.crawledArticles].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  async testCrawler(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.crawlNews(undefined, '1', ['人工智能'])
      return {
        success: result.success,
        message: result.success ? '公开互联网新闻抓取成功' : result.error || 'AI 爬虫连接失败',
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      }
    }
  }
}
