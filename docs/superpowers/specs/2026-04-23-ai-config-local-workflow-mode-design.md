# AI 配置跳过与本地工作流模式设计

## 背景

当前应用默认假设用户会尽快配置 AI 模型，因此聊天页、工作流入口和配置页都围绕“AI 可用”展开。实际使用中，存在一类用户只需要固定规则、本地执行的工作流，例如 `/个税报表`。这类用户不应被 AI 配置阻塞，也不应在未配置 AI 时持续看到不可用的 AI 对话和 AI 工作流入口。

本设计的目标是让用户可以在不配置 AI 的前提下直接进入“本地工作流模式”，同时在聊天页和系统配置页中获得明确、可恢复的引导。

## 目标

- 在现有 [系统配置](/Users/shibo/Documents/trae_projects/AINews/src/pages/Config.tsx) 页面中，为 AI 配置提供“可跳过”的首屏引导。
- 用户跳过 AI 配置后，应用进入“仅本地工作流可用”的模式。
- 在该模式下，聊天页只显示和允许执行纯本地规则工作流。
- 在该模式下，普通聊天输入不再尝试调用 AI，而是返回明确引导，提示用户前往【设置】->【系统配置】配置 AI 模型。
- 依赖 AI 的工作流在 UI 中隐藏，并在服务端执行层增加保护，避免绕过前端调用。

## 非目标

- 不新增独立 onboarding 页面或首次启动弹窗。
- 不重写整个配置页结构，只改造 AI 配置区的首屏状态与引导。
- 不改变现有 `/个税报表` 工作流的业务逻辑。
- 不为所有工作流自动推断“是否依赖 AI”；本次只需要为现有内置工作流建立明确标识并基于该标识过滤。

## 用户状态模型

为用户配置增加一个显式状态位，用于区分“暂未配置”与“已主动跳过”。

建议新增字段：

- `workspace.localWorkflowOnly: boolean`

含义：

- `false`
  - 默认状态。
  - 用户仍处于常规模式，允许配置和使用 AI。
- `true`
  - 用户已主动跳过 AI 配置。
  - 应用进入“本地工作流模式”。

AI 实际可用性仍然由“当前是否存在可用模型”决定，因此运行时有三种有效状态：

1. `AI 已配置`
   - `localWorkflowOnly = false`
   - 存在可用 AI 模型
2. `未配置 AI，且未跳过`
   - `localWorkflowOnly = false`
   - 不存在可用 AI 模型
3. `已跳过 AI，进入本地工作流模式`
   - `localWorkflowOnly = true`
   - 无论是否存在残留未激活模型，都按“仅本地工作流”处理，直到用户重新进入 AI 配置流程并保存可用模型

## 工作流能力标识

为工作流增加显式能力标识，避免前端通过名称硬编码判断。

建议新增字段：

- `executionMode: 'ai' | 'local'`

约定：

- `/个税报表` 标记为 `local`
- `/新闻助手`、`/新闻推送` 标记为 `ai`

后续新增工作流时必须显式声明该字段。

## 配置页设计

### 入口形态

在 [系统配置](/Users/shibo/Documents/trae_projects/AINews/src/pages/Config.tsx) 的 AI 配置区顶部展示一个首屏引导卡，替代“用户还没有模型时直接展示完整表单”的默认体验。

### 首屏引导内容

引导卡需要同时提供两条路径：

- `立即配置 AI`
  - 展开或进入现有 AI 模型配置表单
- `跳过，先用本地工作流`
  - 将 `workspace.localWorkflowOnly` 置为 `true`
  - 显示成功提示
  - 配置页切换到“本地工作流模式已启用”的说明状态

说明文案要明确：

- 配置 AI 后，可使用智能对话与 AI 工作流
- 跳过后，仅可使用本地规则工作流，例如 `/个税报表`

### 已跳过状态

当 `workspace.localWorkflowOnly = true` 且没有可用 AI 模型时，AI 配置区改为“已跳过”状态卡，而不是继续默认展示完整表单。

状态卡应包含：

- 当前状态说明：已启用本地工作流模式
- 可用范围：仅支持本地规则工作流
- 恢复入口：`去配置 AI 模型`

点击 `去配置 AI 模型` 后：

- 清除 `workspace.localWorkflowOnly`
- 展示现有 AI 模型配置 UI

## 聊天页行为设计

### 工作流显示规则

聊天页中的工作流建议列表、`+` 菜单中的工作流入口、命令补全与指令提示，应基于运行时模式过滤：

- `AI 可用`：显示全部工作流
- `本地工作流模式` 或 `未配置 AI`
  - 仅显示 `executionMode = 'local'` 的工作流

本次对现有内置工作流的预期：

- 显示：`/个税报表`
- 隐藏：`/新闻助手`、`/新闻推送`

### 普通聊天输入

当用户未配置 AI 模型且当前不能使用 AI 聊天时：

- 普通自然语言输入不调用 `/api/ai/chat`
- 对话区插入一条系统型引导消息

建议文案：

`当前未配置 AI 模型，无法使用 AI 进行沟通，请前往【设置】中的【系统配置】配置 AI 模型。`

这条消息应：

- 使用 `messageType: 'system'`
- 在视觉上明显区别于用户消息和工作流结果
- 可包含“前往系统配置”的快捷入口（如已有导航能力）

### 本地工作流指令

当用户输入本地工作流指令，例如 `/个税报表`：

- 继续允许解析和执行
- 不受 AI 未配置影响

### AI 工作流指令兜底

如果用户手动输入一个被隐藏的 AI 工作流指令，例如 `/新闻推送`：

- 前端可提示该工作流当前不可用
- 后端执行层必须再次拦截，返回明确错误而不是执行

## 服务端约束

### 配置接口

[ConfigService](/Users/shibo/Documents/trae_projects/AINews/api/services/ConfigService.ts) 和共享类型需要支持持久化 `workspace.localWorkflowOnly`。

要求：

- 老配置兼容，默认值为 `false`
- 保存和读取配置时都保留该字段

### 工作流定义

[WorkflowService](/Users/shibo/Documents/trae_projects/AINews/api/services/WorkflowService.ts) 需要为内置工作流补齐 `executionMode`。

### AI 聊天接口

[AIController](/Users/shibo/Documents/trae_projects/AINews/api/controllers/AIController.ts) 或其所依赖服务在处理普通聊天请求前，需要检查：

- 当前是否存在可用 AI 模型
- 当前是否处于 `localWorkflowOnly`

若不可用，则直接返回适合前端展示的引导性结果，而不是再进入 AIService 调用。

### 工作流执行接口

[WorkflowExecutionService](/Users/shibo/Documents/trae_projects/AINews/api/services/WorkflowExecutionService.ts) 在执行工作流前检查：

- 若工作流 `executionMode = 'ai'`
- 且当前配置不可用或已进入本地工作流模式

则拒绝执行，并返回清晰错误：

- `当前未配置可用 AI 模型，该工作流暂不可用`

## 前端数据流调整

### 配置快照

聊天页当前已有 `configSnapshot` 和 `activeAiModel`。本次需要新增一个统一判定：

- `canUseAiChat`
- `localWorkflowOnly`

推荐从配置快照推导，而不是散落在多个组件中重复判断。

### 工作流过滤

工作流过滤应在聊天页本地完成，并尽量使用统一 helper，而不是在多个 `useMemo` 和事件处理中分别硬编码。

推荐新增辅助函数：

- `canUseWorkflow(workflow, configState)`
- `getVisibleWorkflows(workflows, configState)`

## 错误处理

- 配置保存失败
  - 不切换模式
  - 保持当前 UI 状态
  - toast 提示失败原因
- 老用户配置缺失新字段
  - 自动回退到默认值 `false`
- 用户已跳过但后来配置成功
  - 保存 AI 模型成功后，自动退出本地工作流模式
- 用户没有 AI，但也没点击跳过
  - 不强制进入本地工作流模式
  - 聊天页仍然禁止 AI 聊天，但配置页文案以“请先配置或跳过”引导为主

## 测试策略

### 前端

- 配置页：
  - 无 AI 模型时显示首屏引导卡
  - 点击“跳过，先用本地工作流”后展示已跳过状态
  - 点击“去配置 AI 模型”后恢复 AI 配置表单
- 聊天页：
  - 本地工作流模式下仅显示 `/个税报表`
  - 自然语言输入返回系统引导消息
  - `/个税报表` 仍可执行

### 后端

- 配置服务：
  - 新字段默认值正确
  - 保存与读取 `localWorkflowOnly` 正常
- 工作流执行：
  - AI 工作流在本地工作流模式下被拒绝
  - 本地工作流在本地工作流模式下可正常执行

## 分阶段实施建议

1. 先补类型和配置持久化字段
2. 再为工作流定义补 `executionMode`
3. 接着改配置页首屏引导与跳过逻辑
4. 最后改聊天页可见性与 AI 聊天限制
5. 补测试并做一次“未配置 AI -> 跳过 -> 仅本地工作流可用”的完整回归
