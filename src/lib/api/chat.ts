import { apiRequest, withJsonBody } from '@/lib/api'

interface ChatResponse {
  content: string
}

export async function chat(payload: {
  userId: string
  message: string
  referencedNewsId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}) {
  try {
    console.log('开始调用 chat 函数:', payload)
    const response = await apiRequest<ChatResponse>('/api/ai/chat', withJsonBody(payload, { method: 'POST' }))
    console.log('chat 函数调用成功:', response)
    return response
  } catch (error) {
    console.error('chat 函数调用失败:', error)
    // 直接抛出错误，不使用模拟响应
    throw error
  }
}
