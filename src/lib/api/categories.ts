import type { NewsCategory } from '@/types'
import { apiRequest, withJsonBody } from '@/lib/api'

export function getCategories() {
  return apiRequest<NewsCategory[]>('/api/categories')
}

export function createCategory(payload: { name: string; description?: string }) {
  return apiRequest<NewsCategory>('/api/categories', withJsonBody(payload, { method: 'POST' }))
}

export function updateCategory(id: string, payload: { name?: string; description?: string }) {
  return apiRequest<NewsCategory>(`/api/categories/${id}`, withJsonBody(payload, { method: 'PUT' }))
}

export function deleteCategory(id: string) {
  return apiRequest<{ success: boolean }>(`/api/categories/${id}`, { method: 'DELETE' })
}
