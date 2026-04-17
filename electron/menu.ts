import { app, Menu, shell } from 'electron'

export function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建新闻',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            console.log('新建新闻')
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.isQuitting = true
            app.quit()
          },
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'CmdOrCtrl+F', role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '学习更多',
          click: async () => {
            await shell.openExternal('https://github.com')
          },
        },
      ],
    },
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { label: `关于 ${app.name}`, role: 'about' },
        { type: 'separator' },
        { label: '服务', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: `隐藏 ${app.name}`, accelerator: 'Cmd+H', role: 'hide' },
        { label: '隐藏其他', accelerator: 'Cmd+Shift+H', role: 'hideOthers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Cmd+Q',
          click: () => {
            app.isQuitting = true
            app.quit()
          },
        },
      ],
    })

    const windowMenu = template.find((item) => item.label === '窗口')
    if (windowMenu?.submenu) {
      (windowMenu.submenu as Electron.MenuItemConstructorOptions[]).push(
        { type: 'separator' },
        { label: '前置所有', role: 'front' }
      )
    }
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
