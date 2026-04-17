function resolveApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001'
  }

  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return window.location.origin.replace(/:\d+$/, ':3001')
  }

  return 'http://localhost:3001'
}

const API_BASE_URL = resolveApiBaseUrl().replace(/\/$/, '')

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
  const response = await fetch(apiUrl(path), init)
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

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
