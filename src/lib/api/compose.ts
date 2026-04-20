import { apiRequest, withJsonBody } from '@/lib/api'

interface ComposeResponse {
  title: string
  content: string
}

export async function compose(payload: {
  userId: string
  prompt: string
  referencedNewsIds?: string[]
}) {
  console.log('compose API:', payload)
  const response = await apiRequest<ComposeResponse>('/api/ai/compose', withJsonBody(payload, { method: 'POST' }))
  console.log('compose response:', response)
  return response
}