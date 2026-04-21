import type { ActiveAIModelInfo, UserConfig } from '@/types'
import { apiRequest, withJsonBody } from '@/lib/api'

export function getConfig(userId: string) {
  return apiRequest<UserConfig>(`/api/config?userId=${encodeURIComponent(userId)}`)
}

export async function getActiveAIModel(userId: string): Promise<ActiveAIModelInfo | null> {
  void userId
  return null
}

export function updateConfig(payload: {
  userId: string
  aiModel: UserConfig['aiModel']
  publishPlatforms: UserConfig['publishPlatforms']
  workspace: UserConfig['workspace']
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

export function uploadWorkspaceAsset(payload: {
  userId: string
  fileName: string
  contentBase64: string
  mimeType: string
}) {
  return apiRequest<{
    success: boolean
    message: string
    data: {
      fileName: string
      filePath: string
      relativePath: string
      mimeType: string
    }
  }>('/api/config/workspace/upload', withJsonBody(payload, { method: 'POST' }))
}
