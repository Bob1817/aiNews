import type { NewsArticle } from '@/types'
import { apiRequest } from '@/lib/api'
import { getMockNewsArticles } from '@/lib/fallbacks'

export async function getRecentNews(userId: string) {
  try {
    console.log('开始获取新闻...')
    console.log('构建的 API URL:', `/api/news/recent?userId=${userId}`)
    // 调用后端API获取新闻
    const articles = await apiRequest<NewsArticle[]>(`/api/news/recent?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    console.log('获取到新闻:', articles)
    
    if (articles && articles.length > 0) {
      return articles
    }
    
    // 如果获取失败，使用模拟数据
    const mockArticles = getMockNewsArticles()
    console.log('使用模拟数据:', mockArticles)
    return mockArticles
  } catch (error) {
    console.error('获取新闻失败:', error)
    // 出错时使用模拟数据
    const mockArticles = getMockNewsArticles()
    console.log('出错时使用模拟数据:', mockArticles)
    return mockArticles
  }
}





export function getSavedNews(_userId: string) {
  // 返回模拟数据
  return Promise.resolve([])
}

export function createSavedNews(payload: {
  userId: string
  title: string
  content: string
  categories?: string[]
  industries?: string[]
  originalNewsId?: string
}) {
  // 返回模拟数据
  return Promise.resolve({
    success: true,
    message: '保存成功',
    data: {
      id: Date.now().toString(),
      userId: payload.userId,
      title: payload.title,
      content: payload.content,
      categories: payload.categories || [],
      industries: payload.industries || [],
      originalNewsId: payload.originalNewsId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
}

export function updateSavedNews(
  id: string,
  payload: { title?: string; content?: string; categories?: string[]; industries?: string[] }
) {
  // 返回模拟数据
  return Promise.resolve({
    success: true,
    message: '更新成功',
    data: {
      id: id,
      userId: '1',
      title: payload.title || '测试新闻',
      content: payload.content || '测试内容',
      categories: payload.categories || [],
      industries: payload.industries || [],
      originalNewsId: '',
      isPublished: false,
      publishedTo: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
}

export function publishNews(_id: string, _platforms: string[]) {
  // 返回模拟数据
  return Promise.resolve({
    success: true,
    message: '发布成功',
    data: {
      success: true,
      message: '新闻已成功发布到所选平台'
    }
  })
}

export function testNewsApi(_payload: {
  provider: 'newsapi' | 'guardian' | 'nytimes'
  apiKey: string
  baseUrl?: string
}) {
  // 返回模拟数据
  return Promise.resolve({
    success: true,
    message: 'API 测试成功'
  })
}
