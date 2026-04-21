import type { NewsArticle, SavedNews } from '@/types'
import { apiRequest, apiUrl } from '@/lib/api'
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
  title?: string
  content: string
  categories?: string[]
  industries?: string[]
  originalNewsId?: string
  originalNewsUrl?: string
  outputType?: 'news' | 'file'
  fileFormat?: 'md' | 'txt' | 'json' | 'html'
  contentFormat?: 'html' | 'markdown' | 'plain'
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
    throw error
  }
}

export function downloadSavedFile(news: SavedNews) {
  if (news.downloadUrl) {
    const link = document.createElement('a')
    link.href = apiUrl(news.downloadUrl)
    link.download = news.fileName || `${news.title}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return
  }

  const blob = new Blob([news.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = news.fileName || `${news.title}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function updateSavedNews(
  id: string,
  payload: {
    title?: string
    content?: string
    categories?: string[]
    industries?: string[]
    contentFormat?: 'html' | 'markdown' | 'plain'
  }
) {
  console.log('开始更新保存的新闻...', { id, payload })
  const result = await apiRequest<{ success: boolean; message: string; data: SavedNews }>(
    `/api/news/saved/${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )
  console.log('更新保存的新闻成功:', result)

  if (result.data) {
    const index = savedNewsMemory.findIndex((news) => news.id === id)
    if (index !== -1) {
      savedNewsMemory[index] = result.data
    } else {
      savedNewsMemory.unshift(result.data)
    }
  }

  return result
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
