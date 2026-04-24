import { AlertCircle, RefreshCw, Info, WifiOff } from 'lucide-react'
import { getErrorMessage, getErrorSuggestion, isNetworkError, isElectronEnvironment } from '@/lib/errors'

interface ApiErrorAlertProps {
  error: unknown
  title?: string
  onRetry?: () => void
  className?: string
}

export function ApiErrorAlert({ error, title, onRetry, className = '' }: ApiErrorAlertProps) {
  const message = getErrorMessage(error)
  const suggestion = getErrorSuggestion(error)
  const isNetwork = isNetworkError(error)
  const isElectron = isElectronEnvironment()

  const getIcon = () => {
    if (isNetwork) return <WifiOff className="h-5 w-5" />
    return <AlertCircle className="h-5 w-5" />
  }

  const getTitle = () => {
    if (title) return title
    if (isNetwork) return '网络连接错误'
    return '操作失败'
  }

  const getNetworkSpecificHelp = () => {
    if (!isNetwork) return null

    if (isElectron) {
      return (
        <div className="mt-3 text-sm">
          <p className="font-medium text-slate-700">Electron 应用故障排除：</p>
          <ul className="mt-2 space-y-1 text-slate-600">
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>尝试重启应用</span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>检查应用日志中是否有 API 服务器启动错误</span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>确保端口 3001 没有被其他应用占用</span>
            </li>
          </ul>
        </div>
      )
    } else {
      return (
        <div className="mt-3 text-sm">
          <p className="font-medium text-slate-700">开发环境故障排除：</p>
          <ul className="mt-2 space-y-1 text-slate-600">
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>运行 <code className="px-1 py-0.5 bg-slate-100 rounded">npm run dev:full</code> 启动完整服务</span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>检查 API 服务器是否在端口 3001 运行</span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>查看终端中是否有服务器错误信息</span>
            </li>
          </ul>
        </div>
      )
    }
  }

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          {getIcon()}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-amber-900">{getTitle()}</h4>
          <p className="mt-1 text-sm text-amber-800">{message}</p>

          {suggestion && (
            <p className="mt-2 text-sm text-amber-700">{suggestion}</p>
          )}

          {getNetworkSpecificHelp()}

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50"
            >
              <RefreshCw className="h-4 w-4" />
              重试
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ApiConnectionStatusProps {
  isConnected: boolean
  isLoading?: boolean
  lastChecked?: Date
}

export function ApiConnectionStatus({ isConnected, isLoading, lastChecked }: ApiConnectionStatusProps) {
  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
        <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
        检查服务器连接...
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        服务器连接正常
        {lastChecked && (
          <span className="text-emerald-600">
            • {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
      <WifiOff className="h-3 w-3" />
      服务器连接失败
    </div>
  )
}