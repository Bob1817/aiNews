const DEFAULT_ELECTRON_API_BASE_URL = 'http://localhost:3001'

function resolveApiBaseUrl() {
  if (typeof window === 'undefined') {
    return DEFAULT_ELECTRON_API_BASE_URL
  }

  if (window.location.protocol === 'file:') {
    return DEFAULT_ELECTRON_API_BASE_URL
  }

  return ''
}

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

export function apiUrl(path?: string) {
  const API_BASE_URL = resolveApiBaseUrl()
  if (!path) {
    return API_BASE_URL
  }
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

    // 处理网络连接错误
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const isElectron = window.location.protocol === 'file:'
      const apiUrlStr = apiUrl(path)

      let errorMessage = '无法连接到服务器'
      let suggestion = ''

      if (isElectron) {
        errorMessage = '无法连接到本地 API 服务器'
        suggestion = '请确保应用已正确启动，API 服务器可能未启动或已崩溃。尝试重启应用。'
      } else {
        errorMessage = '无法连接到 API 服务器'
        suggestion = '请检查网络连接，并确保服务器正在运行。'
      }

      throw new ApiError(
        `${errorMessage} (${apiUrlStr})`,
        0,
        {
          originalError: error.message,
          suggestion,
          isNetworkError: true,
          isElectron,
          apiUrl: apiUrlStr
        }
      )
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查服务是否正在运行', 408)
    }

    // 重新抛出其他错误
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(
      error instanceof Error ? error.message : '未知错误',
      0,
      error
    )
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
