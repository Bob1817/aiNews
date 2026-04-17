import { app, BrowserWindow, Menu, Tray, nativeImage, Notification, ipcMain } from 'electron'
import path from 'path'
import { createMenu } from './menu'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../resources/icons/icon.png')
  const trayIcon = nativeImage.createFromPath(iconPath)
  
  tray = new Tray(trayIcon)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show()
      },
    },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])
  
  tray.setToolTip('AI 新闻创作工具')
  tray.setContextMenu(contextMenu)
  
  tray.on('double-click', () => {
    mainWindow?.show()
  })
}

app.whenReady().then(() => {
  createMenu()
  createWindow()
  
  if (process.platform !== 'darwin') {
    createTray()
  }
  
  // 处理来自前端的通知请求
  ipcMain.handle('send-notification', (event, title, body) => {
    new Notification({
      title,
      body,
      icon: path.join(__dirname, '../resources/icons/icon.png')
    }).show()
    return true
  })
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
})
