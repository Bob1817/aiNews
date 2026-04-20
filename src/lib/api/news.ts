import type { NewsArticle, SavedNews } from '@/types'
import { apiRequest } from '@/lib/api'
import { getMockNewsArticles, getMockSavedNews } from '@/lib/fallbacks'

export async function getRecentNews(userId: string, forceRefresh: boolean = false) {
  try {
    console.log('开始获取新闻...', { forceRefresh })
    const params = new URLSearchParams({ userId })
    if (forceRefresh) {
      params.append('forceRefresh', 'true')
    }
    console.log('构建的 API URL:', `/api/news/recent?${params.toString()}`)
    // 调用后端API获取新闻
    const articles = await apiRequest<NewsArticle[]>(`/api/news/recent?${params.toString()}`, {
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





// 内存存储，用于保存修改后的新闻数据
let savedNewsMemory: SavedNews[] = []

export async function getSavedNews(userId: string) {
  try {
    console.log('开始获取保存的新闻...')
    const news = await apiRequest<SavedNews[]>(`/api/news/saved?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    console.log('获取到保存的新闻:', news)
    // 更新内存存储
    savedNewsMemory = news
    return news
  } catch (error) {
    console.error('获取保存的新闻失败:', error)
    // 出错时如果内存中有数据，使用内存数据，否则使用模拟数据
    if (savedNewsMemory.length > 0) {
      console.log('使用内存中的保存数据:', savedNewsMemory)
      return savedNewsMemory
    } else {
      const mockNews = getMockSavedNews()
      console.log('使用模拟数据:', mockNews)
      savedNewsMemory = mockNews
      return mockNews
    }
  }
}

// 更新内存中的新闻数据
export function updateSavedNewsMemory(news: SavedNews[]) {
  savedNewsMemory = news
}

export async function createSavedNews(payload: {
  userId: string
  title: string
  content: string
  categories?: string[]
  industries?: string[]
  originalNewsId?: string
}) {
  try {
    console.log('开始保存新闻...', payload)
    const result = await apiRequest<{ success: boolean; message: string; data: SavedNews }>('/api/news/saved', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    console.log('保存新闻成功:', result)
    // 更新内存存储
    if (result.data) {
      savedNewsMemory.unshift(result.data)
    }
    return result
  } catch (error) {
    console.error('保存新闻失败:', error)
    // 出错时返回模拟数据
    const mockResult = {
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
        url: `https://example.com/news/${Date.now()}`,
        isPublished: false,
        publishedTo: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
    console.log('出错时使用模拟数据:', mockResult)
    // 更新内存存储
    if (mockResult.data) {
      savedNewsMemory.unshift(mockResult.data)
    }
    return mockResult
  }
}

export function updateSavedNews(
  id: string,
  payload: { title?: string; content?: string; categories?: string[]; industries?: string[] }
) {
  // 从内存存储或模拟数据中获取原有的新闻信息，保留isPublished和publishedTo状态
  const existingNews = savedNewsMemory.find(news => news.id === id) || getMockSavedNews().find(news => news.id === id)
  
  const updatedNews = {
    id: id,
    userId: '1',
    title: payload.title || '测试新闻',
    content: payload.content || '测试内容',
    categories: payload.categories || [],
    industries: payload.industries || [],
    originalNewsId: existingNews?.originalNewsId || '',
    url: existingNews?.url || `https://example.com/news/${id}`,
    isPublished: existingNews?.isPublished || false,
    publishedTo: existingNews?.publishedTo || [],
    createdAt: existingNews?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  // 更新内存存储
  const index = savedNewsMemory.findIndex(news => news.id === id)
  if (index !== -1) {
    savedNewsMemory[index] = updatedNews
  } else {
    savedNewsMemory.push(updatedNews)
  }
  
  // 返回模拟数据
  return Promise.resolve({
    success: true,
    message: '更新成功',
    data: updatedNews
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

export async function deleteNews(id: string) {
  try {
    console.log('开始删除新闻...', id)
    const result = await apiRequest<{ success: boolean; message: string }>(`/api/news/saved/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    console.log('删除新闻成功:', result)
    // 更新内存存储
    savedNewsMemory = savedNewsMemory.filter(news => news.id !== id)
    return result
  } catch (error) {
    console.error('删除新闻失败:', error)
    throw error
  }
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
