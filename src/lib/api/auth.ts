import type { User, UserProfile } from '@/types'
import { apiRequest, withJsonBody } from '@/lib/api'

interface AuthResponse {
  user: User
  profile: UserProfile
}

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthResponse>('/api/user/login', withJsonBody(payload, { method: 'POST' }))
}

export function register(payload: { name: string; email: string; password: string }) {
  return apiRequest<AuthResponse>('/api/user/register', withJsonBody(payload, { method: 'POST' }))
}
