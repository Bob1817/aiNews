import { app, BrowserWindow, Menu, Tray, nativeImage, Notification, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import { fork, ChildProcess } from 'child_process'
import { createMenu } from './menu'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let apiServerProcess: ChildProcess | null = null

function startApiServer() {
  // 只在生产环境或非开发服务器模式下启动API服务器
  // 在开发模式下，API服务器应该通过 npm run dev:full 启动
  const isDev = !!process.env.VITE_DEV_SERVER_URL

  if (!isDev) {
    try {
      const apiServerPath = path.join(__dirname, '../dist-api/api/index.js')
      console.log('启动API服务器:', apiServerPath)

      apiServerProcess = fork(apiServerPath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '3001',
          HOST: '127.0.0.1'
        }
      })

      apiServerProcess.stdout?.on('data', (data) => {
        console.log(`API服务器输出: ${data}`)
      })

      apiServerProcess.stderr?.on('data', (data) => {
        console.error(`API服务器错误: ${data}`)
      })

      apiServerProcess.on('error', (err) => {
        console.error('API服务器启动失败:', err)
      })

      apiServerProcess.on('exit', (code, signal) => {
        console.log(`API服务器退出，代码: ${code}, 信号: ${signal}`)
        apiServerProcess = null
      })

      console.log('API服务器启动成功')
    } catch (error) {
      console.error('启动API服务器时出错:', error)
    }
  } else {
    console.log('开发模式：使用外部API服务器（通过 npm run dev:full 启动）')
  }
}

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
  
  tray.setToolTip('AI 助手')
  tray.setContextMenu(contextMenu)
  
  tray.on('double-click', () => {
    mainWindow?.show()
  })
}

app.whenReady().then(() => {
  // 启动API服务器
  startApiServer()

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

  ipcMain.handle('select-directory', async () => {
    const targetWindow = BrowserWindow.getFocusedWindow() || mainWindow
    const result = await dialog.showOpenDialog(targetWindow || undefined, {
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('open-path', async (_event, targetPath: string) => {
    if (!targetPath) {
      return false
    }

    const result = await shell.openPath(targetPath)
    return result === ''
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
  // 停止API服务器
  stopApiServer()
})

function stopApiServer() {
  if (apiServerProcess) {
    console.log('正在停止API服务器...')
    apiServerProcess.kill('SIGTERM')
    apiServerProcess = null
    console.log('API服务器已停止')
  }
}
