import { apiRequest, withJsonBody } from '@/lib/api'

interface ChatResponse {
  content: string
}

export function chat(payload: {
  userId: string
  message: string
  referencedNewsId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}) {
  return apiRequest<ChatResponse>('/api/ai/chat', withJsonBody(payload, { method: 'POST' }))
}
