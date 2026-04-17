declare global {
  interface Window {
    electronAPI: {
      platform: string
      sendNotification: (title: string, body: string) => Promise<boolean>
    }
  }
}

export {}
