import { useState, useEffect, useCallback } from 'react'
import { X, Minus, Square, Maximize, Download, RefreshCw, CheckCircle2 } from 'lucide-react'

export function TitleBar() {
  const [appVersion, setAppVersion] = useState('1.0.0')
  const [updateStatus, setUpdateStatus] = useState<{
    status: 'checking' | 'available' | 'not-available' | 'error' | 'downloading' | 'downloaded' | 'dev-mode' | 'no-update' | 'installing'
    version?: string
    releaseNotes?: string
    error?: string
    progress?: number
  }>({ status: 'not-available' })
  const [windowState, setWindowState] = useState<'normal' | 'maximized' | 'fullscreen'>('normal')
  const [isElectron, setIsElectron] = useState(false)
  const [isMacOS, setIsMacOS] = useState(false)

  useEffect(() => {
    const hasElectron = typeof window !== 'undefined' && window.electronAPI
    setIsElectron(hasElectron)

    // 检测是否是 macOS 平台
    let isDarwin = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    if (hasElectron && window.electronAPI?.platform) {
      isDarwin = window.electronAPI.platform === 'darwin'
    }
    setIsMacOS(isDarwin)

    if (hasElectron) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version)
      })

      const unsubscribeUpdate = window.electronAPI.onUpdateStatus((status) => {
        setUpdateStatus(status)
      })

      const unsubscribeWindow = window.electronAPI.onWindowStateChanged((state) => {
        if (state === 'maximized' || state === 'fullscreen') {
          setWindowState(state)
        } else {
          setWindowState('normal')
        }
      })

      return () => {
        unsubscribeUpdate()
        unsubscribeWindow()
      }
    }
  }, [])

  const handleMinimize = useCallback(() => {
    if (isElectron) {
      window.electronAPI.minimizeWindow()
    }
  }, [isElectron])

  const handleMaximize = useCallback(() => {
    if (isElectron) {
      window.electronAPI.maximizeWindow()
    }
  }, [isElectron])

  const handleClose = useCallback(() => {
    if (isElectron) {
      window.electronAPI.closeWindow()
    }
  }, [isElectron])

  const handleFullscreen = useCallback(() => {
    if (isElectron) {
      window.electronAPI.toggleFullscreen()
    }
  }, [isElectron])

  const handleCheckUpdate = useCallback(() => {
    if (isElectron) {
      window.electronAPI.checkForUpdates()
    }
  }, [isElectron])

  const handleDownloadUpdate = useCallback(() => {
    if (isElectron) {
      window.electronAPI.downloadUpdate()
    }
  }, [isElectron])

  const handleInstallUpdate = useCallback(() => {
    if (isElectron) {
      window.electronAPI.installUpdate()
    }
  }, [isElectron])

  return (
    <div className={`titlebar-drag-region relative flex h-10 w-full select-none items-center justify-between bg-white/80 ${isMacOS ? 'pl-20' : 'pl-2'} pr-2 backdrop-blur-sm border-b border-gray-200/60`}>
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">AI 助手</span>
          <span className="text-xs text-gray-400">v{appVersion}</span>
          {updateStatus.status === 'available' && (
            <button
              onClick={handleDownloadUpdate}
              className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Download className="h-3 w-3" />
              更新
            </button>
          )}
          {updateStatus.status === 'downloading' && (
            <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {updateStatus.progress !== undefined ? `${Math.round(updateStatus.progress)}%` : '下载中...'}
            </div>
          )}
          {updateStatus.status === 'downloaded' && (
            <button
              onClick={handleInstallUpdate}
              className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 hover:bg-green-100 transition-colors"
            >
              <CheckCircle2 className="h-3 w-3" />
              安装更新
            </button>
          )}
          {updateStatus.status === 'dev-mode' && (
            <span className="text-xs text-gray-400">开发模式</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleCheckUpdate}
          className="titlebar-no-drag h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="检查更新"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${updateStatus.status === 'checking' ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={handleFullscreen}
          className="titlebar-no-drag h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title={windowState === 'fullscreen' ? '退出全屏' : '全屏'}
        >
          <Maximize className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleMinimize}
          className="titlebar-no-drag h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="最小化"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="titlebar-no-drag h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title={windowState === 'maximized' ? '还原' : '最大化'}
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="titlebar-no-drag h-7 w-7 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
          title="关闭"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
