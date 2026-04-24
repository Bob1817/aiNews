# 标题栏与自动更新功能说明

## 新增功能概览

### 1. 自定义标题栏

- **无框窗口设计**: 移除了系统默认的窗口边框，采用自定义标题栏
- **拖拽功能**: 标题栏区域支持拖拽移动窗口
- **窗口控制按钮**:
  - ✕ 关闭按钮
  - □ 最大化/还原按钮
  - - 最小化按钮
  - ⤢ 全屏/退出全屏按钮
- **版本显示**: 显示当前应用版本号
- **应用名称**: 显示应用名称和Logo

### 2. 自动更新功能

- **定期检查**: 每24小时自动检查更新（生产环境）
- **手动检查**: 用户可以点击刷新按钮手动检查更新
- **更新状态显示**:
  - 检查中状态（刷新图标旋转）
  - 发现更新（显示"更新"按钮）
  - 下载中（显示进度百分比）
  - 下载完成（显示"安装更新"按钮）
- **桌面通知**: 更新时会发送系统通知
- **开发模式**: 在开发环境下禁用自动更新，显示"开发模式"标签

## 实现细节

### 前端组件 (`src/components/TitleBar.tsx`)

#### 特性

- 使用 React Hooks 管理状态
- TypeScript 类型安全
- 响应式设计
- 优雅的悬停动画效果
- 与 Electron API 无缝集成

#### 关键功能

```typescript
// 获取应用版本
window.electronAPI.getAppVersion()

// 窗口控制
window.electronAPI.minimizeWindow()
window.electronAPI.maximizeWindow()
window.electronAPI.closeWindow()
window.electronAPI.toggleFullscreen()

// 更新相关
window.electronAPI.checkForUpdates()
window.electronAPI.downloadUpdate()
window.electronAPI.installUpdate()

// 事件监听
window.electronAPI.onUpdateStatus(callback)
window.electronAPI.onWindowStateChanged(callback)
```

### Electron 主进程 (`electron/main.ts`)

#### 更新服务

- 集成 `electron-updater` 库
- 配置自动更新检查间隔
- 处理更新生命周期事件
- 支持优雅关闭

#### 窗口状态管理

- 监听最大化/还原事件
- 监听全屏/退出全屏事件
- 通过 IPC 向前端通知状态变化

### Preload 脚本 (`electron/preload.ts`)

- 暴露安全的 Electron API 到渲染进程
- 类型定义完整
- 事件监听器支持注销

### 样式 (`src/index.css`)

- 添加了 `-webkit-app-region` 样式支持拖拽
- 优化了布局以适应无框窗口
- 防止内容溢出

## 配置说明

### 自动更新配置 (`package.json`)

```json
"build": {
  "publish": {
    "provider": "generic",
    "url": "https://example.com/updates"
  }
}
```

**注意**: 在生产部署时，需要将 `url` 替换为实际的更新服务器地址。

### 环境配置示例 (`/.env.production`)

生产环境配置文件已创建，包含所有必要的配置项。

## 使用说明

### 启动应用

```bash
# 开发模式
npm run dev:full

# 构建并打包
npm run electron:build:mac  # macOS
npm run electron:build      # 所有平台
```

### 更新服务器设置

要启用自动更新功能，需要：

1. 配置更新服务器地址（在 package.json 中）
2. 在服务器上托管更新文件（由 electron-builder 生成）
3. 确保用户网络可以访问更新服务器

### 开发模式测试

在开发模式下，自动更新功能会被禁用，方便开发测试。

## 文件清单

### 新增文件

- `src/components/TitleBar.tsx` - 标题栏组件
- `.env.production` - 生产环境配置示例
- `DEPLOYMENT_CHECKLIST.md` - 部署检查清单
- `FEATURE_TITLEBAR_UPDATER.md` - 本说明文档

### 修改文件

- `package.json` - 添加 electron-updater 依赖和更新配置
- `electron/main.ts` - 更新 Electron 主进程代码
- `electron/preload.ts` - 扩展 preload API
- `src/App.tsx` - 集成标题栏组件
- `src/index.css` - 添加标题栏样式
- `vite.config.ts` - 优化构建配置（之前已优化）

## 注意事项

1. **网络权限**: 自动更新需要网络访问权限
2. **macOS 公证**: 分发 macOS 应用需要进行代码签名和公证
3. **Windows 证书**: Windows 应用建议使用代码签名证书
4. **更新服务器**: 需要配置可访问的更新服务器
5. **版本号**: 更新时需要增加版本号以触发更新检测

## 未来改进

- 支持更新日志显示
- 支持选择性更新
- 支持增量更新
- 添加更新回滚功能
- 优化更新下载速度和稳定性
