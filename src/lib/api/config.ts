import type { UserConfig } from '@/types'
import { apiRequest, withJsonBody } from '@/lib/api'

export function getConfig(userId: string) {
  return apiRequest<UserConfig>(`/api/config?userId=${encodeURIComponent(userId)}`)
}

export function updateConfig(payload: {
  userId: string
  aiModel: UserConfig['aiModel']
  newsAPI?: UserConfig['newsAPI']
  publishPlatforms: UserConfig['publishPlatforms']
}) {
  return apiRequest<UserConfig>('/api/config', withJsonBody(payload, { method: 'PUT' }))
}
