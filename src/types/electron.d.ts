declare global {
  interface Window {
    electronAPI: {
      platform: string
      sendNotification: (title: string, body: string) => Promise<boolean>
      selectDirectory: () => Promise<string | null>
      openPath: (targetPath: string) => Promise<boolean>
      getAppVersion: () => Promise<string>
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      toggleFullscreen: () => Promise<void>
      checkForUpdates: () => Promise<{
        status: 'checking' | 'available' | 'not-available' | 'error' | 'downloading' | 'downloaded' | 'dev-mode' | 'no-update' | 'installing'
        version?: string
        releaseNotes?: string
        error?: string
        progress?: number
      }>
      downloadUpdate: () => Promise<{
        status: 'checking' | 'available' | 'not-available' | 'error' | 'downloading' | 'downloaded' | 'dev-mode' | 'no-update' | 'installing'
        version?: string
        releaseNotes?: string
        error?: string
        progress?: number
      }>
      installUpdate: () => Promise<{
        status: 'checking' | 'available' | 'not-available' | 'error' | 'downloading' | 'downloaded' | 'dev-mode' | 'no-update' | 'installing'
        version?: string
        releaseNotes?: string
        error?: string
        progress?: number
      }>
      onUpdateStatus: (callback: (status: {
        status: 'checking' | 'available' | 'not-available' | 'error' | 'downloading' | 'downloaded' | 'dev-mode' | 'no-update' | 'installing'
        version?: string
        releaseNotes?: string
        error?: string
        progress?: number
      }) => void) => () => void
      onWindowStateChanged: (callback: (state: 'maximized' | 'unmaximized' | 'fullscreen' | 'unfullscreen') => void) => () => void
    }
  }
}

export {}
