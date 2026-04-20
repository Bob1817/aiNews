// 使用相对路径，让 Vite 代理处理
const API_BASE_URL = ''

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    console.log('开始 API 请求:', apiUrl(path), init)
    
    const response = await fetch(apiUrl(path), {
      ...init
    })
    
    console.log('API 请求响应:', response.status, response.statusText)
    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const data = isJson ? await response.json() : await response.text()
    console.log('API 请求数据:', data)

    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String(data.message)
          : typeof data === 'object' && data !== null && 'error' in data
            ? String(data.error)
            : `请求失败: ${response.status}`

      throw new ApiError(message, response.status, data)
    }

    return data as T
  } catch (error) {
    console.error('API 请求错误:', error)
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查服务是否正在运行', 408)
    }
    throw error
  }
}

export function withJsonBody(body: unknown, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    body: JSON.stringify(body),
  }
}
