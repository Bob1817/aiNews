# AI 助手

AI 助手是一个基于 Electron、React、TypeScript 和 Express 构建的桌面工作平台。它以对话为核心入口，通过工作流机制把不同日常工作任务组织为可调用的 AI 能力。

当前版本已经将原有的“AI 新闻助手”能力沉淀为一个内置工作流 `新闻助手`，并支持在聊天窗口中通过 slash command 调用工作流。

## 核心能力
- 聊天优先：默认首页是聊天工作台。
- 工作流平台：支持内置工作流和自定义工作流。
- 双命令调用：支持 `/<工作流名称>` 与 `/+<工作流名称>`。
- 严格执行：命中工作流后，AI 优先遵循工作流定义。
- 结果沉淀：输出内容可保存为任务结果继续编辑或发布。

## 当前内置工作流
- `新闻助手`
  - 适合基于新闻素材做摘要、改写、标题生成、简讯与稿件初稿。

## 技术栈
- 前端：React 18 + TypeScript + Vite + Tailwind CSS
- 桌面端：Electron
- 后端：Express + TypeScript
- 状态管理：Zustand
- 测试：Jest + Testing Library

## 开发命令
```bash
npm install
npm run dev:full
```

常用命令：
```bash
npm run dev
npm run dev:api:ts
npm run typecheck:frontend
npm run typecheck:api
npm test -- --runInBand
```

## 工作流调用方式
在聊天输入框中可以直接输入：

```text
/新闻助手 帮我把这条新闻改写成 300 字简讯
/+news-assistant 输出 3 个标题备选
```

如果先在聊天页选择了工作流，也可以直接输入自然语言任务，系统会自动按当前工作流执行。

## 项目文档
- 产品需求文档：[.trae/documents/prd.md](/Users/shibo/Documents/trae_projects/AINews/.trae/documents/prd.md)
- 技术架构文档：[.trae/documents/arch.md](/Users/shibo/Documents/trae_projects/AINews/.trae/documents/arch.md)
- 平台改造任务文档：[.trae/documents/ai_assistant_platform_plan.md](/Users/shibo/Documents/trae_projects/AINews/.trae/documents/ai_assistant_platform_plan.md)
- UI/UX 标准：[docs/UI_UX_STANDARDS.md](/Users/shibo/Documents/trae_projects/AINews/docs/UI_UX_STANDARDS.md)
- 设计系统：[design-system/ai-news-tool/MASTER.md](/Users/shibo/Documents/trae_projects/AINews/design-system/ai-news-tool/MASTER.md)

## 当前状态
首版已完成平台化主路径：
- AI 助手命名统一
- 聊天主工作台
- 工作流管理页
- slash command 工作流调用
- 新闻助手内置工作流适配

后续可以继续扩展更多工作任务工作流，让 AI 助手逐步成为统一的桌面工作入口。
