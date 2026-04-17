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
    // API 调用失败时使用模拟响应
    return {
      content: `您好！我是 AI 助手。您刚刚说："${payload.message}"。\n\n这是一个模拟回复，因为无法连接到 AI 服务。\n\n您可以尝试以下操作：\n1. 检查 Ollama 服务是否正在运行\n2. 检查网络连接是否正常\n3. 稍后再试`
    }
  }
}
