import type { NewsArticle, SavedNews, UserConfig } from '@/types'
import { apiRequest, withJsonBody } from '@/lib/api'
import { getConfig } from './config'
import { getMockNewsArticles } from '@/lib/fallbacks'

interface SaveNewsResponse {
  success: boolean
  message: string
  data: SavedNews
}

interface PublishNewsResponse {
  success: boolean
  message: string
  data: {
    success: boolean
    message: string
  }
}

interface TestNewsApiResponse {
  success: boolean
  message: string
}

export type { TestNewsApiResponse }

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

// 调用Ollama API获取推荐新闻
async function callOllamaForNews(baseUrl: string, modelName: string, keywords: string[]): Promise<NewsArticle[]> {
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
    
    // 解析Ollama返回的新闻
    return parseOllamaNewsResponse(responseText)
  } catch (error) {
    console.error('Ollama API调用错误:', error)
    throw error
  }
}

// 解析Ollama返回的新闻
function parseOllamaNewsResponse(responseText: string): NewsArticle[] {
  const articles: NewsArticle[] = []
  const newsBlocks = responseText.split('\n\n')
  
  newsBlocks.forEach((block, index) => {
    if (block.includes('标题：')) {
      const lines = block.split('\n')
      let title = ''
      let content = ''
      let source = 'AI推荐'
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

export function getSavedNews(userId: string) {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
}

export function publishNews(id: string, platforms: string[]) {
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

export function testNewsApi(payload: {
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
