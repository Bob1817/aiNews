import type { UserProfile } from '@/types'
import { apiRequest, withJsonBody } from '@/lib/api'

export function getUserProfile(userId: string) {
  return apiRequest<UserProfile>(`/api/user/profile?userId=${encodeURIComponent(userId)}`)
}

export function updateUserProfile(payload: {
  userId: string
  industries?: string[]
  keywords?: string[]
  isOnboardingComplete?: boolean
}) {
  return apiRequest<UserProfile>('/api/user/profile', withJsonBody(payload, { method: 'PUT' }))
}
