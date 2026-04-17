import type { NewsArticle, SavedNews } from '@/types'
import { apiRequest, withJsonBody } from '@/lib/api'

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

export function getRecentNews(userId: string) {
  return apiRequest<NewsArticle[]>(`/api/news/recent?userId=${encodeURIComponent(userId)}`)
}

export function getSavedNews(userId: string) {
  return apiRequest<SavedNews[]>(`/api/news/saved?userId=${encodeURIComponent(userId)}`)
}

export function createSavedNews(payload: {
  userId: string
  title: string
  content: string
  categories?: string[]
  industries?: string[]
  originalNewsId?: string
}) {
  return apiRequest<SaveNewsResponse>('/api/news/saved', withJsonBody(payload, { method: 'POST' }))
}

export function updateSavedNews(
  id: string,
  payload: { title?: string; content?: string; categories?: string[]; industries?: string[] }
) {
  return apiRequest<SaveNewsResponse>(
    `/api/news/saved/${id}`,
    withJsonBody(payload, { method: 'PUT' })
  )
}

export function publishNews(id: string, platforms: string[]) {
  return apiRequest<PublishNewsResponse>(
    `/api/news/publish/${id}`,
    withJsonBody({ platforms }, { method: 'POST' })
  )
}

export function testNewsApi(payload: {
  provider: 'newsapi' | 'guardian' | 'nytimes'
  apiKey: string
  baseUrl?: string
}) {
  return apiRequest<TestNewsApiResponse>('/api/news/test-api', withJsonBody(payload, { method: 'POST' }))
}
