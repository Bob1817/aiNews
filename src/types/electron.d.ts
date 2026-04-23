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

export {}
