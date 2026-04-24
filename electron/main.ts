import { app, BrowserWindow, Menu, Tray, nativeImage, Notification, ipcMain, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { fork, ChildProcess } from 'child_process'
import { createMenu } from './menu'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let apiServerProcess: ChildProcess | null = null
let updateAvailable = false
let updateDownloaded = false

const isDev = !!process.env.VITE_DEV_SERVER_URL
const CHECK_UPDATE_INTERVAL = 24 * 60 * 60 * 1000 // 24小时

function startApiServer() {
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
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!)
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

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-state-changed', 'maximized')
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-state-changed', 'unmaximized')
  })

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window-state-changed', 'fullscreen')
  })

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window-state-changed', 'unfullscreen')
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

function setupAutoUpdater() {
  if (isDev) {
    console.log('开发模式：禁用自动更新')
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    updateAvailable = true
    mainWindow?.webContents.send('update-status', { 
      status: 'available', 
      version: info.version,
      releaseNotes: info.releaseNotes
    })
    new Notification({
      title: '发现新版本',
      body: `AI 助手 ${info.version} 可用，点击下载更新`,
    }).show()
  })

  autoUpdater.on('update-not-available', () => {
    updateAvailable = false
    mainWindow?.webContents.send('update-status', { status: 'not-available' })
  })

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-status', { 
      status: 'error', 
      error: err.message 
    })
    console.error('更新错误:', err)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('update-status', { 
      status: 'downloading', 
      progress: progressObj.percent
    })
  })

  autoUpdater.on('update-downloaded', () => {
    updateDownloaded = true
    mainWindow?.webContents.send('update-status', { status: 'downloaded' })
    new Notification({
      title: '更新已下载',
      body: '点击立即安装更新',
    }).show()
  })

  checkForUpdates()
  setInterval(checkForUpdates, CHECK_UPDATE_INTERVAL)
}

function checkForUpdates() {
  if (!isDev) {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('检查更新失败:', err)
    })
  }
}

app.whenReady().then(() => {
  startApiServer()
  createMenu()
  createWindow()

  if (process.platform !== 'darwin') {
    createTray()
  }

  setupAutoUpdater()

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

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle('window-close', () => {
    app.isQuitting = true
    mainWindow?.close()
  })

  ipcMain.handle('window-fullscreen', () => {
    if (mainWindow?.isFullScreen()) {
      mainWindow.setFullScreen(false)
    } else {
      mainWindow?.setFullScreen(true)
    }
  })

  ipcMain.handle('check-for-updates', () => {
    if (isDev) {
      return { status: 'dev-mode' }
    }
    checkForUpdates()
    return { status: 'checking' }
  })

  ipcMain.handle('download-update', () => {
    if (isDev) {
      return { status: 'dev-mode' }
    }
    if (updateAvailable) {
      autoUpdater.downloadUpdate()
      return { status: 'downloading' }
    }
    return { status: 'no-update' }
  })

  ipcMain.handle('install-update', () => {
    if (isDev) {
      return { status: 'dev-mode' }
    }
    if (updateDownloaded) {
      autoUpdater.quitAndInstall()
      return { status: 'installing' }
    }
    return { status: 'no-update' }
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
