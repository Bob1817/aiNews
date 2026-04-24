import { ApiError } from './api'

export function getErrorMessage(error: unknown, fallback = '操作失败') {
  if (error instanceof ApiError) {
    // 如果是网络连接错误，提供更友好的提示
    if (error.status === 0 || (error.data && typeof error.data === 'object' && 'isNetworkError' in error.data)) {
      const errorData = error.data as any

      if (errorData?.isElectron) {
        return `无法连接到本地 API 服务器。请确保应用已正确启动，如果问题持续存在，请尝试重启应用。`
      } else {
        return `无法连接到服务器。请检查网络连接并确保服务器正在运行。`
      }
    }

    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function getErrorSuggestion(error: unknown): string | null {
  if (error instanceof ApiError && error.data && typeof error.data === 'object') {
    const errorData = error.data as any

    if (errorData?.suggestion) {
      return errorData.suggestion
    }

    if (errorData?.isNetworkError) {
      if (errorData?.isElectron) {
        return '这可能是由于 API 服务器启动失败导致的。请检查应用日志或尝试重启应用。'
      } else {
        return '请检查网络连接，并确保 API 服务器正在运行。如果是开发环境，请运行 `npm run dev:full` 启动完整服务。'
      }
    }
  }

  return null
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError && error.data && typeof error.data === 'object') {
    const errorData = error.data as any
    return errorData?.isNetworkError === true
  }

  return false
}

export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'file:'
}
