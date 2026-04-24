import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

type UpdateStatus = {
  status: 'checking' | 'available' | 'not-available' | 'error' | 'downloading' | 'downloaded' | 'dev-mode' | 'no-update' | 'installing'
  version?: string
  releaseNotes?: string
  error?: string
  progress?: number
}

type WindowState = 'maximized' | 'unmaximized' | 'fullscreen' | 'unfullscreen'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  sendNotification: (title: string, body: string) => {
    return ipcRenderer.invoke('send-notification', title, body)
  },
  selectDirectory: () => {
    return ipcRenderer.invoke('select-directory') as Promise<string | null>
  },
  openPath: (targetPath: string) => {
    return ipcRenderer.invoke('open-path', targetPath) as Promise<boolean>
  },
  getAppVersion: () => {
    return ipcRenderer.invoke('get-app-version') as Promise<string>
  },
  minimizeWindow: () => {
    return ipcRenderer.invoke('window-minimize')
  },
  maximizeWindow: () => {
    return ipcRenderer.invoke('window-maximize')
  },
  closeWindow: () => {
    return ipcRenderer.invoke('window-close')
  },
  toggleFullscreen: () => {
    return ipcRenderer.invoke('window-fullscreen')
  },
  checkForUpdates: () => {
    return ipcRenderer.invoke('check-for-updates') as Promise<UpdateStatus>
  },
  downloadUpdate: () => {
    return ipcRenderer.invoke('download-update') as Promise<UpdateStatus>
  },
  installUpdate: () => {
    return ipcRenderer.invoke('install-update') as Promise<UpdateStatus>
  },
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const handler = (_event: IpcRendererEvent, status: UpdateStatus) => callback(status)
    ipcRenderer.on('update-status', handler)
    return () => {
      ipcRenderer.off('update-status', handler)
    }
  },
  onWindowStateChanged: (callback: (state: WindowState) => void) => {
    const handler = (_event: IpcRendererEvent, state: WindowState) => callback(state)
    ipcRenderer.on('window-state-changed', handler)
    return () => {
      ipcRenderer.off('window-state-changed', handler)
    }
  },
})

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
      checkForUpdates: () => Promise<UpdateStatus>
      downloadUpdate: () => Promise<UpdateStatus>
      installUpdate: () => Promise<UpdateStatus>
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void
      onWindowStateChanged: (callback: (state: WindowState) => void) => () => void
    }
  }
}
