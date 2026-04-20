import type { ActiveAIModelInfo, UserConfig } from '@/types'
import { apiRequest, withJsonBody } from '@/lib/api'

export function getConfig(userId: string) {
  return apiRequest<UserConfig>(`/api/config?userId=${encodeURIComponent(userId)}`)
}

export function getActiveAIModel(userId: string) {
  return apiRequest<ActiveAIModelInfo>(`/api/config/active-model?userId=${encodeURIComponent(userId)}`)
}

export function updateConfig(payload: {
  userId: string
  aiModel: UserConfig['aiModel']
  newsAPI?: UserConfig['newsAPI']
  publishPlatforms: UserConfig['publishPlatforms']
  aiModels?: UserConfig['aiModels']
}) {
  return apiRequest<UserConfig>('/api/config', withJsonBody(payload, { method: 'PUT' }))
}

export function testAIModel(payload: {
  aiModel: UserConfig['aiModel']
}) {
  return apiRequest<{ success: boolean; message: string }>('/api/config/test-ai', withJsonBody(payload, { method: 'POST' }))
}

export async function getOllamaModels(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/tags`)
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data
      ? String(data.error)
      : `请求失败: ${response.status}`
    throw new Error(message)
  }

  return data as { models: Array<{ name: string; model: string }> }
}

export function switchAIModel(payload: {
  userId: string
  modelId: string
}) {
  return apiRequest<UserConfig>('/api/config/switch-model', withJsonBody(payload, { method: 'POST' }))
}

export function deleteAIModel(payload: {
  userId: string
  modelId: string
}) {
  return apiRequest<UserConfig>('/api/config/delete-model', withJsonBody(payload, { method: 'POST' }))
}
