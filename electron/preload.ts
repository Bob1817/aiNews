import { contextBridge, ipcRenderer } from 'electron'

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
})

declare global {
  interface Window {
    electronAPI: {
      platform: string
      sendNotification: (title: string, body: string) => Promise<boolean>
      selectDirectory: () => Promise<string | null>
      openPath: (targetPath: string) => Promise<boolean>
    }
  }
}
