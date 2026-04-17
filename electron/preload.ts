import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  sendNotification: (title: string, body: string) => {
    return ipcRenderer.invoke('send-notification', title, body)
  },
})

declare global {
  interface Window {
    electronAPI: {
      platform: string
      sendNotification: (title: string, body: string) => Promise<boolean>
    }
  }
}
