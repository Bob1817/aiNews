# AI 新闻创作工具 - 实施计划

## 1. 项目概述

本项目是一个基于人工智能的桌面端新闻创作平台，主要功能包括：
- 桌面客户端（Mac 和 Windows）
- 对话式交互界面
- 用户偏好设置（行业、关键词）
- 定时新闻推送（每天早 8 点、下午 3 点）
- 新闻引用与 AI 二次创作
- 新闻保存、编辑和发布功能
- AI 模型和推送平台配置

## 2. 技术栈选择

- **前端框架**: React 18 + TypeScript + Tailwind CSS 3 + Vite
- **桌面框架**: Electron
- **后端**: Express.js 4 + TypeScript
- **数据库**: Supabase (PostgreSQL)
- **状态管理**: Zustand
- **路由**: React Router DOM
- **图标**: Lucide React
- **定时任务**: node-cron
- **打包工具**: electron-builder

## 3. 项目结构设计

```
AINews/
├── .trae/documents/              # 文档目录
│   ├── prd.md                   # 产品需求文档
│   ├── arch.md                  # 技术架构文档
│   └── ai_news_tool_plan.md     # 本计划文档
├── electron/                     # Electron 主进程代码
│   ├── main.ts                  # 主进程入口
│   ├── preload.ts               # 预加载脚本
│   └── menu.ts                  # 应用菜单
├── src/                         # 前端代码（渲染进程）
│   ├── components/             # 组件
│   ├── pages/                  # 页面
│   ├── hooks/                  # 自定义 hooks
│   ├── store/                  # Zustand 状态管理
│   ├── utils/                  # 工具函数
│   └── types/                  # TypeScript 类型定义
├── api/                         # 后端代码
│   ├── controllers/            # 控制器
│   ├── services/               # 业务逻辑
│   ├── repositories/           # 数据访问
│   ├── middleware/             # 中间件
│   ├── routes/                 # 路由
│   └── types/                  # 类型定义
├── supabase/                    # Supabase 配置
│   └── migrations/             # 数据库迁移文件
├── shared/                      # 共享类型定义
├── resources/                   # 应用资源
│   ├── icons/                  # 应用图标
│   └── images/                 # 图片资源
└── build/                       # 构建配置
    ├── electron-builder.yml    # electron-builder 配置
    └── notarize.js             # Mac 公证配置
```

## 4. 实施步骤

### 核心功能优先开发策略
按照以下优先级开发核心功能：
1. **MVP 1**: AI 检索新闻并推送展示
2. **MVP 2**: AI 读取新闻并提取主题后再创作新闻
3. **MVP 3**: 新闻展示以及编辑操作
4. **MVP 4**: 新闻推送发布
5. **完善**: 其他辅助功能和桌面端优化

### 阶段一：项目初始化与 Electron 配置
1. 初始化 Electron + React + Express 项目
2. 配置 TypeScript、Tailwind CSS、ESLint 等开发工具
3. 设置项目目录结构
4. 配置 electron-builder 打包工具
5. 初始化 Supabase 项目并配置数据库
6. 创建 Electron 主进程和预加载脚本
7. 配置 Mac 和 Windows 应用菜单和窗口样式

### 阶段二：后端核心功能开发（MVP 1-4）
1. 设置 Express 服务器和基础中间件
2. 创建数据库表结构和迁移文件
3. **MVP 1**: 实现新闻检索服务 API
   - 集成新闻数据源 API
   - 实现基于关键词和行业的新闻检索
   - 实现新闻存储和获取 API
4. **MVP 2**: 实现 AI 新闻创作服务 API
   - 集成 LLM API
   - 实现新闻内容分析和主题提取
   - 实现基于新闻的二次创作 API
5. **MVP 3**: 实现新闻管理 API
   - 实现新闻保存、获取、更新 API
   - 实现新闻编辑功能
6. **MVP 4**: 实现新闻发布服务 API
   - 实现官网发布接口集成
   - 实现微信公众号发布接口集成
7. 实现定时任务（每天早 8 点、下午 3 点更新新闻）
8. 实现用户管理和配置管理 API（后续完善）

### 阶段三：前端核心功能开发（MVP 1-4）
1. 设置 React Router 路由
2. 创建 Zustand 状态管理 store
3. **MVP 1**: 实现新闻推送展示界面
   - 新闻卡片组件
   - 新闻列表展示
   - 新闻详情查看
4. **MVP 2**: 实现 AI 创作界面
   - 对话交互组件
   - 新闻引用功能
   - AI 创作结果展示
5. **MVP 3**: 实现新闻编辑界面
   - 富文本编辑器集成
   - 新闻保存功能
6. **MVP 4**: 实现新闻发布界面
   - 发布平台选择
   - 发布状态展示
7. 实现其他页面（后续完善）
8. 优化 Mac 和 Windows 平台 UI 适配

### 阶段四：桌面端优化与打包
1. 实现系统托盘功能
2. 实现通知推送功能
3. 优化窗口管理（最小化、最大化等）
4. 配置应用图标和资源
5. 配置 Mac 代码签名和公证
6. 配置 Windows 代码签名
7. 测试 Mac 和 Windows 安装包
8. 修复平台特定问题

### 阶段五：完善与优化
1. 实现用户登录/注册
2. 实现用户设置页面（行业、关键词）
3. 实现系统配置页面
4. 完善响应式布局
5. 性能优化
6. 用户体验优化

## 5. 文件与模块清单

### 需要创建/编辑的文件

#### 项目配置文件
- package.json
- tsconfig.json
- tsconfig.node.json (Electron 主进程配置)
- vite.config.ts
- tailwind.config.js
- postcss.config.js
- build/electron-builder.yml
- build/notarize.js

#### Electron 文件
- electron/main.ts (主进程入口)
- electron/preload.ts (预加载脚本)
- electron/menu.ts (应用菜单)

#### 前端文件
- src/main.tsx (渲染进程入口文件)
- src/App.tsx (根组件)
- src/router/index.tsx (路由配置)
- src/store/index.ts (Zustand store)
- src/pages/Chat.tsx (对话交互页面 - MVP 1/2)
- src/pages/NewsList.tsx (新闻列表页面 - MVP 3)
- src/pages/NewsEdit.tsx (新闻编辑页面 - MVP 3)
- src/pages/Login.tsx (登录页面 - 后续)
- src/pages/Register.tsx (注册页面 - 后续)
- src/pages/Settings.tsx (用户设置页面 - 后续)
- src/pages/Config.tsx (系统配置页面 - 后续)
- src/components/NewsCard.tsx (新闻卡片组件 - MVP 1)
- src/components/ConversationItem.tsx (对话组件 - MVP 2)
- src/components/Sidebar.tsx (侧边栏组件)
- src/hooks/useElectron.ts (Electron API hook)
- src/types/index.ts

#### 后端文件
- api/index.ts (服务器入口)
- api/routes/index.ts
- api/controllers/NewsController.ts (MVP 1/3)
- api/controllers/AIController.ts (MVP 2)
- api/controllers/PublishController.ts (MVP 4)
- api/controllers/UserController.ts (后续)
- api/controllers/ConfigController.ts (后续)
- api/services/NewsService.ts (MVP 1)
- api/services/AIService.ts (MVP 2)
- api/services/PublishService.ts (MVP 4)
- api/services/UserService.ts (后续)
- api/services/ScheduledService.ts (定时任务)
- api/repositories/NewsRepository.ts (MVP 1)
- api/repositories/SavedNewsRepository.ts (MVP 3)
- api/repositories/UserRepository.ts (后续)
- api/repositories/ConfigRepository.ts (后续)
- api/middleware/auth.ts (后续)
- api/types/index.ts

#### 数据库文件
- supabase/migrations/001_init_tables.sql
- supabase/migrations/002_create_indexes.sql
- supabase/migrations/003_enable_rls.sql

## 6. 风险与注意事项

### 潜在风险
1. **第三方 API 依赖风险**: 新闻数据源、AI 模型、微信公众号等外部服务可能不稳定
2. **定时任务可靠性**: 需要确保新闻定时更新任务稳定运行
3. **数据安全**: 用户配置（API 密钥等）需要安全存储

### 应对措施
1. **外部 API 容错**: 实现重试机制和降级方案
2. **任务监控**: 记录定时任务执行日志，异常时告警
3. **安全存储**: 敏感配置使用加密存储，Supabase RLS 确保数据安全

## 7. 后续优化方向

1. 增加更多新闻数据源
2. 支持更多 AI 模型
3. 增加更多发布平台
4. 实现新闻模板功能
5. 增加团队协作功能
6. 实现新闻数据统计和分析
