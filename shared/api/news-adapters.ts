import { NewsArticle, UserProfile } from '../types'
import { NewsAdapter } from './news-api.interface'

export class NewsAPIAdapter extends NewsAdapter {
  getName(): string {
    return 'NewsAPI'
  }

  async fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]> {
    const baseUrl = this.config.baseUrl || 'https://newsapi.org/v2'
    // 使用中文相关关键词，并添加中国来源
    const keywords = userProfile?.keywords || ['technology', 'business', '科技', '商业', '中国', '中文']
    const industries = userProfile?.industries || ['科技', '商业']

    const query = this.buildQuery(keywords)

    try {
      // 使用 everything 端点，搜索中文相关内容
      const requestUrl = `${baseUrl}/everything?apiKey=${this.config.apiKey}&q=${encodeURIComponent(query)}&pageSize=20&sortBy=publishedAt`
      const { response, data } = await this.fetchJsonWithTimeout(requestUrl, this.config.timeout)

      if (!response.ok) {
        const remoteMessage = data && typeof data === 'object' && 'message' in data ? `: ${(data as any).message}` : ''
        throw new Error(`NewsAPI 请求失败 ${response.status}${remoteMessage}`)
      }

      if (data.articles && Array.isArray(data.articles)) {
        // 过滤掉标题为 [Removed] 的新闻，并优先选择中文来源
        const validArticles = data.articles.filter((article: any) =>
          article.title && article.title !== '[Removed]' && article.title !== ''
        )

        // 优先选择中文来源的新闻
        const chineseSources = ['新浪', '腾讯', '网易', '搜狐', '人民日报', '新华社', '央视新闻', '中国新闻网']
        const chineseArticles = validArticles.filter((article: any) =>
          chineseSources.some(source => article.source?.name?.includes(source) || article.title?.includes(source))
        )

        // 如果中文新闻不够，使用其他新闻
        const articlesToUse = chineseArticles.length >= 5 ? chineseArticles : validArticles

        // 随机选择最多10条新闻
        const shuffledArticles = this.shuffleArray(articlesToUse)
        const selectedArticles = shuffledArticles.slice(0, 10)

        return selectedArticles.map((article: any, index: number) => ({
          id: `newsapi-${index}-${Date.now()}`,
          title: article.title || '无标题',
          content: article.description || article.content || '',
          source: article.source?.name || '未知来源',
          url: article.url || '',
          publishedAt: article.publishedAt || new Date().toISOString(),
          relatedIndustries: industries,
          relatedKeywords: keywords,
        }))
      }

      return []
    } catch (error) {
      console.error('NewsAPI 调用错误:', error)
      throw error
    }
  }

  // 随机打乱数组
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}

export class GuardianAPIAdapter extends NewsAdapter {
  getName(): string {
    return 'The Guardian'
  }

  async fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]> {
    const baseUrl = this.config.baseUrl || 'https://content.guardianapis.com'
    const keywords = userProfile?.keywords || ['technology', 'business']

    const query = this.buildQuery(keywords)

    try {
      const requestUrl = `${baseUrl}/search?api-key=${this.config.apiKey}&q=${encodeURIComponent(query)}&show-fields=headline,trailText,webUrl,publicationDate&page-size=20`
      const { response, data } = await this.fetchJsonWithTimeout(requestUrl, this.config.timeout)

      if (!response.ok) {
        const remoteMessage = data && typeof data === 'object' && 'message' in data ? `: ${(data as any).message}` : ''
        throw new Error(`Guardian API 请求失败 ${response.status}${remoteMessage}`)
      }

      if (data.response?.results && Array.isArray(data.response.results)) {
        return data.response.results.map((article: any, index: number) => ({
          id: `guardian-${index}-${Date.now()}`,
          title: article.fields?.headline || article.webTitle || '无标题',
          content: article.fields?.trailText || '',
          source: 'The Guardian',
          url: article.fields?.webUrl || article.webUrl || '',
          publishedAt: article.fields?.publicationDate || article.webPublicationDate || new Date().toISOString(),
          relatedIndustries: userProfile?.industries || [],
          relatedKeywords: keywords,
        }))
      }

      return []
    } catch (error) {
      console.error('Guardian API 调用错误:', error)
      throw error
    }
  }
}

export class NYTAPIAdapter extends NewsAdapter {
  getName(): string {
    return 'New York Times'
  }

  async fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]> {
    const baseUrl = this.config.baseUrl || 'https://api.nytimes.com/svc/search/v2'
    const keywords = userProfile?.keywords || ['technology', 'business']

    const query = this.buildQuery(keywords)

    try {
      const requestUrl = `${baseUrl}/articlesearch.json?api-key=${this.config.apiKey}&q=${encodeURIComponent(query)}&fl=headline,abstract,web_url,pub_date,source&page=0`
      const { response, data } = await this.fetchJsonWithTimeout(requestUrl, this.config.timeout)

      if (!response.ok) {
        const remoteMessage = data && typeof data === 'object' && 'fault' in data && (data as any).fault && 'faultstring' in (data as any).fault ? `: ${(data as any).fault.faultstring}` : ''
        throw new Error(`NYT API 请求失败 ${response.status}${remoteMessage}`)
      }

      if (data.response?.docs && Array.isArray(data.response.docs)) {
        return data.response.docs.map((article: any, index: number) => ({
          id: `nyt-${index}-${Date.now()}`,
          title: article.headline?.main || '无标题',
          content: article.abstract || '',
          source: article.source || 'New York Times',
          url: article.web_url || '',
          publishedAt: article.pub_date || new Date().toISOString(),
          relatedIndustries: userProfile?.industries || [],
          relatedKeywords: keywords,
        }))
      }

      return []
    } catch (error) {
      console.error('NYT API 调用错误:', error)
      throw error
    }
  }
}