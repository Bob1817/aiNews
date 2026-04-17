# AI 新闻创作工具

一个基于人工智能的桌面端新闻创作平台，支持 Mac 和 Windows 系统。

## 功能特性

### MVP 核心功能（已实现）
1. **AI 检索新闻并推送展示** - 顶部新闻推送区域，展示最新新闻
2. **AI 读取新闻并提取主题后再创作新闻** - 对话式 AI 交互，支持引用新闻进行创作
3. **新闻展示以及编辑操作** - 新闻管理页面，支持新建、编辑新闻
4. **新闻推送发布** - 支持发布到官网和微信公众号

### 技术栈
- **桌面框架**: Electron
- **前端**: React 18 + TypeScript + Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router DOM
- **构建工具**: Vite + electron-builder

## 快速开始

### 安装依赖
```bash
npm install
```

### 环境变量
```bash
cp .env.example .env
```

默认前端会请求 `VITE_API_BASE_URL`，本地开发默认为 `http://localhost:3001`。

### 开发模式
```bash
npm run dev
```

### 构建应用
```bash
# 构建所有平台
npm run electron:build

# 仅构建 Mac 版本
npm run electron:build:mac

# 仅构建 Windows 版本
npm run electron:build:win
```

## 项目结构

```
AINews/
├── electron/              # Electron 主进程代码
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本
│   └── menu.ts           # 应用菜单
├── src/                  # 前端代码
│   ├── components/       # 组件
│   │   ├── Sidebar.tsx
│   │   ├── NewsCard.tsx
│   │   └── ConversationItem.tsx
│   ├── pages/            # 页面
│   │   ├── Chat.tsx      # 对话创作页面
│   │   ├── NewsList.tsx  # 新闻管理页面
│   │   └── NewsEdit.tsx  # 新闻编辑页面
│   ├── store/            # Zustand 状态管理
│   ├── types/            # TypeScript 类型定义
│   ├── App.tsx           # 根组件
│   ├── main.tsx          # 入口文件
│   └── index.css         # 全局样式
├── .trae/documents/      # 项目文档
│   ├── prd.md           # 产品需求文档
│   ├── arch.md          # 技术架构文档
│   └── ai_news_tool_plan.md  # 实施计划
└── package.json
```

## 核心功能说明

### 1. 对话创作页面 (/chat)
- 顶部显示最新新闻推送
- 支持选择新闻进行引用
- 与 AI 进行对话式交互
- AI 基于引用的新闻进行二次创作

### 2. 新闻管理页面 (/news)
- 展示所有保存的新闻
- 支持按发布状态筛选
- 点击编辑按钮进入编辑页面

### 3. 新闻编辑页面 (/news/edit/:id?)
- 支持新建和编辑新闻
- 标题和内容编辑
- 支持发布到官网和微信公众号

## 后续开发计划

- [ ] 集成真实的新闻数据源 API
- [ ] 集成真实的 LLM API
- [ ] 实现用户认证系统
- [ ] 实现定时新闻更新任务
- [ ] 完善发布平台集成
- [ ] 添加系统配置页面
- [ ] 优化 Electron 打包和签名

## 许可证

MIT
