# AI 配置跳过与本地工作流模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户可以在未配置 AI 模型时跳过 AI 配置、仅使用本地规则工作流，并在聊天页获得明确的受限引导。

**Architecture:** 在用户配置中新增 `workspace.localWorkflowOnly` 状态，并为工作流定义新增 `executionMode`。前端基于配置快照过滤工作流与聊天能力，后端在 AI 聊天与工作流执行入口增加兜底校验，确保本地工作流模式下只允许纯本地规则流程。

**Tech Stack:** React、TypeScript、Zustand、Express、Jest

---

### Task 1: 扩展共享类型与配置持久化

**Files:**
- Modify: `/Users/shibo/Documents/trae_projects/AINews/shared/types/index.ts`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/types/index.ts`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/api/services/ConfigService.ts`
- Test: `/Users/shibo/Documents/trae_projects/AINews/api/services/ConfigService.ts`

- [ ] **Step 1: 在共享类型中为配置与工作流增加新字段**

```ts
export interface UserConfig {
  // ...
  workspace: {
    rootPath: string
    allowAiAccess: boolean
    localWorkflowOnly?: boolean
  }
}

export interface WorkflowDefinition {
  // ...
  executionMode: 'ai' | 'local'
}
```

- [ ] **Step 2: 同步前端类型镜像**

```ts
export interface UserConfig {
  workspace: {
    rootPath: string
    allowAiAccess: boolean
    localWorkflowOnly?: boolean
  }
}

export interface WorkflowDefinition {
  executionMode: 'ai' | 'local'
}
```

- [ ] **Step 3: 在配置服务中补默认值与归一化**

```ts
private normalizeWorkspace(workspace?: Partial<UserConfig['workspace']>): UserConfig['workspace'] {
  return {
    rootPath: workspace?.rootPath || DEFAULT_WORKSPACE_ROOT,
    allowAiAccess: workspace?.allowAiAccess ?? true,
    localWorkflowOnly: workspace?.localWorkflowOnly ?? false,
  }
}
```

- [ ] **Step 4: 确保读取旧配置时自动补齐 `localWorkflowOnly`**

```ts
if (!config.workspace) {
  config.workspace = this.normalizeWorkspace()
} else {
  config.workspace = this.normalizeWorkspace(config.workspace)
}
```

- [ ] **Step 5: 确保保存配置时保留 `workspace.localWorkflowOnly`**

```ts
if (configData.workspace) {
  config.workspace = this.normalizeWorkspace({
    ...config.workspace,
    ...configData.workspace,
  })
}
```

- [ ] **Step 6: 运行类型检查，确认类型扩展无破坏**

Run: `npm run typecheck`

Expected: `typecheck` 通过，无 `UserConfig` 或 `WorkflowDefinition` 类型错误。

- [ ] **Step 7: Commit**

```bash
git add shared/types/index.ts src/types/index.ts api/services/ConfigService.ts
git commit -m "feat: add local workflow only config state"
```

### Task 2: 为内置工作流增加执行模式并封装可见性判断

**Files:**
- Modify: `/Users/shibo/Documents/trae_projects/AINews/api/services/WorkflowService.ts`
- Create: `/Users/shibo/Documents/trae_projects/AINews/src/lib/utils/workflowAccess.ts`
- Test: `/Users/shibo/Documents/trae_projects/AINews/src/lib/utils/workflowAccess.test.ts`

- [ ] **Step 1: 先写前端工作流可见性判断的失败测试**

```ts
import { getVisibleWorkflows } from './workflowAccess'

test('returns only local workflows when localWorkflowOnly is enabled', () => {
  const workflows = [
    { id: 'workflow-tax-report', executionMode: 'local' },
    { id: 'workflow-news-digest', executionMode: 'ai' },
  ] as any

  expect(
    getVisibleWorkflows(workflows, { hasAiModel: false, localWorkflowOnly: true }).map((item) => item.id)
  ).toEqual(['workflow-tax-report'])
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- src/lib/utils/workflowAccess.test.ts --runInBand`

Expected: FAIL，提示模块或 `getVisibleWorkflows` 尚不存在。

- [ ] **Step 3: 为内置工作流补 `executionMode`**

```ts
return {
  id: 'workflow-tax-report',
  // ...
  executionMode: 'local',
}

return {
  id: 'workflow-news-digest',
  // ...
  executionMode: 'ai',
}

return {
  id: 'workflow-news-assistant',
  // ...
  executionMode: 'ai',
}
```

- [ ] **Step 4: 实现前端工作流访问 helper**

```ts
import type { WorkflowDefinition } from '@/types'

export function canUseWorkflow(
  workflow: WorkflowDefinition,
  config: { hasAiModel: boolean; localWorkflowOnly: boolean }
) {
  if (workflow.executionMode === 'local') {
    return true
  }

  return config.hasAiModel && !config.localWorkflowOnly
}

export function getVisibleWorkflows(
  workflows: WorkflowDefinition[],
  config: { hasAiModel: boolean; localWorkflowOnly: boolean }
) {
  return workflows.filter((workflow) => canUseWorkflow(workflow, config))
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- src/lib/utils/workflowAccess.test.ts --runInBand`

Expected: PASS，验证本地工作流模式下只返回 `/个税报表`。

- [ ] **Step 6: Commit**

```bash
git add api/services/WorkflowService.ts src/lib/utils/workflowAccess.ts src/lib/utils/workflowAccess.test.ts
git commit -m "feat: add workflow execution mode gating"
```

### Task 3: 改造系统配置页 AI 配置区首屏引导

**Files:**
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/lib/fallbacks.ts`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/lib/api/config.ts`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/pages/Config.tsx`
- Test: `/Users/shibo/Documents/trae_projects/AINews/src/pages/Config.tsx`

- [ ] **Step 1: 让默认配置表单具备 `localWorkflowOnly`**

```ts
workspace: {
  rootPath: '',
  allowAiAccess: true,
  localWorkflowOnly: false,
}
```

- [ ] **Step 2: 更新配置 API payload 类型**

```ts
export function updateConfig(payload: {
  userId: string
  aiModel: UserConfig['aiModel']
  publishPlatforms: UserConfig['publishPlatforms']
  workspace: UserConfig['workspace']
  aiModels?: UserConfig['aiModels']
}) {
  return apiRequest<UserConfig>('/api/config', withJsonBody(payload, { method: 'PUT' }))
}
```

- [ ] **Step 3: 在配置页推导 AI 配置首屏状态**

```ts
const hasConfiguredAi = useMemo(() => {
  return configuredModels.length > 0 || isModelConfigured(config.aiModel)
}, [configuredModels, config.aiModel])

const isLocalWorkflowOnly = config.workspace.localWorkflowOnly ?? false
const shouldShowAiIntro = !hasConfiguredAi
```

- [ ] **Step 4: 添加“立即配置 AI / 跳过，先用本地工作流”引导卡**

```tsx
{shouldShowAiIntro && !isEditingAiConfig ? (
  <section>
    <h3>配置 AI，或先使用本地工作流</h3>
    <button onClick={() => setIsEditingAiConfig(true)}>立即配置 AI</button>
    <button
      onClick={() =>
        void updateConfig({
          userId: '1',
          aiModel: config.aiModel,
          aiModels: config.aiModels,
          publishPlatforms: config.publishPlatforms,
          workspace: { ...config.workspace, localWorkflowOnly: true },
        })
      }
    >
      跳过，先用本地工作流
    </button>
  </section>
) : null}
```

- [ ] **Step 5: 添加“已跳过”状态卡与恢复入口**

```tsx
{isLocalWorkflowOnly && !hasConfiguredAi ? (
  <div>
    <p>已启用本地工作流模式</p>
    <p>当前仅支持本地规则工作流，例如 /个税报表。</p>
    <button
      onClick={() =>
        setConfig((current) => ({
          ...current,
          workspace: { ...current.workspace, localWorkflowOnly: false },
        }))
      }
    >
      去配置 AI 模型
    </button>
  </div>
) : null}
```

- [ ] **Step 6: 运行页面相关测试或最小类型检查**

Run: `npm run typecheck:frontend`

Expected: PASS，配置页状态新增后无类型错误。

- [ ] **Step 7: Commit**

```bash
git add src/lib/fallbacks.ts src/lib/api/config.ts src/pages/Config.tsx
git commit -m "feat: add AI setup skip state in config page"
```

### Task 4: 聊天页切换到本地工作流模式

**Files:**
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/pages/Chat.tsx`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/lib/api/chat.ts`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/store/index.ts`
- Test: `/Users/shibo/Documents/trae_projects/AINews/src/pages/Chat.tsx`

- [ ] **Step 1: 在聊天页统一推导 AI 可用性和本地工作流模式**

```ts
const localWorkflowOnly = configSnapshot?.workspace?.localWorkflowOnly ?? false
const hasConfiguredAi = Boolean(activeAiModel?.configured)
const canUseAiChat = hasConfiguredAi && !localWorkflowOnly
```

- [ ] **Step 2: 用统一 helper 过滤聊天页工作流列表**

```ts
const visibleWorkflows = useMemo(
  () =>
    getVisibleWorkflows(workflowList, {
      hasAiModel: hasConfiguredAi,
      localWorkflowOnly,
    }),
  [workflowList, hasConfiguredAi, localWorkflowOnly]
)
```

- [ ] **Step 3: 保证 `selectedWorkflow` 失效时自动回退**

```ts
useEffect(() => {
  if (selectedWorkflow && !canUseWorkflow(selectedWorkflow, { hasAiModel: hasConfiguredAi, localWorkflowOnly })) {
    setSelectedWorkflow(null)
  }
}, [selectedWorkflow, hasConfiguredAi, localWorkflowOnly, setSelectedWorkflow])
```

- [ ] **Step 4: 普通自然语言输入在不可用时返回系统消息而非调用 AI**

```ts
if (!parsedWorkflow && !canUseAiChat) {
  addConversationMessage({
    id: `system-${Date.now()}`,
    conversationId: targetConversationId,
    role: 'assistant',
    content: '当前未配置 AI 模型，无法使用 AI 进行沟通，请前往【设置】中的【系统配置】配置 AI 模型。',
    createdAt: new Date().toISOString(),
    messageType: 'system',
  })
  return
}
```

- [ ] **Step 5: 在输入区附近增加受限提示**

```tsx
{!canUseAiChat ? (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
    当前未配置 AI 模型，无法使用 AI 进行沟通，请前往【设置】中的【系统配置】配置 AI 模型。
  </div>
) : null}
```

- [ ] **Step 6: 运行前端类型检查**

Run: `npm run typecheck:frontend`

Expected: PASS，聊天页新增模式判断后无类型错误。

- [ ] **Step 7: Commit**

```bash
git add src/pages/Chat.tsx src/lib/api/chat.ts src/store/index.ts
git commit -m "feat: restrict chat to local workflows without AI config"
```

### Task 5: 在服务端拦截不可用 AI 工作流与 AI 聊天

**Files:**
- Modify: `/Users/shibo/Documents/trae_projects/AINews/api/controllers/AIController.ts`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/api/services/WorkflowExecutionService.ts`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/api/controllers/ConfigController.ts`
- Test: `/Users/shibo/Documents/trae_projects/AINews/api/services/WorkflowExecutionService.ts`

- [ ] **Step 1: 在服务端封装配置可用性判断**

```ts
function canUseAi(config: UserConfig) {
  const localWorkflowOnly = config.workspace?.localWorkflowOnly ?? false
  const hasConfiguredAi =
    hasConfiguredAIModel(config.aiModel) || Boolean(config.aiModels?.find((item) => item.isActive || item.modelName))

  return hasConfiguredAi && !localWorkflowOnly
}
```

- [ ] **Step 2: 在 AIController 普通聊天入口添加拒绝分支**

```ts
if (!canUseAi(config)) {
  res.json({
    success: true,
    data: {
      message: {
        role: 'assistant',
        content: '当前未配置 AI 模型，无法使用 AI 进行沟通，请前往【设置】中的【系统配置】配置 AI 模型。',
        messageType: 'system',
      },
    },
  })
  return
}
```

- [ ] **Step 3: 在工作流执行服务中拦截 `executionMode = 'ai'`**

```ts
if (workflow.executionMode === 'ai' && !canUseAi(config)) {
  throw new Error('当前未配置可用 AI 模型，该工作流暂不可用')
}
```

- [ ] **Step 4: 运行工作流相关测试**

Run: `npm test -- api/__tests__/TaxReportWorkflowService.test.ts api/__tests__/SavedNewsService.test.ts --runInBand`

Expected: PASS，现有本地工作流测试不受影响。

- [ ] **Step 5: Commit**

```bash
git add api/controllers/AIController.ts api/services/WorkflowExecutionService.ts api/controllers/ConfigController.ts
git commit -m "feat: enforce local workflow mode on server"
```

### Task 6: 补本次模式切换回归测试

**Files:**
- Create: `/Users/shibo/Documents/trae_projects/AINews/src/lib/utils/workflowAccess.test.ts`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/pages/__tests__/SavedFileWorkbench.test.tsx`
- Create: `/Users/shibo/Documents/trae_projects/AINews/src/pages/__tests__/Chat.localWorkflowMode.test.tsx`
- Create: `/Users/shibo/Documents/trae_projects/AINews/api/__tests__/WorkflowExecutionService.local-mode.test.ts`

- [ ] **Step 1: 写聊天页“仅本地工作流可见”的测试**

```ts
test('shows only local workflows when AI is skipped', async () => {
  // mock configSnapshot.workspace.localWorkflowOnly = true
  // mock workflows = [/个税报表(local), /新闻推送(ai)]
  // assert only /个税报表 is rendered
})
```

- [ ] **Step 2: 写聊天页“普通输入返回系统引导”的测试**

```ts
test('returns system guidance instead of AI chat when no AI model is configured', async () => {
  // type normal message
  // assert system message content is rendered
})
```

- [ ] **Step 3: 写服务端“AI 工作流被拒绝”的测试**

```ts
test('rejects ai workflow execution when localWorkflowOnly is enabled', async () => {
  await expect(service.execute(...)).rejects.toThrow('当前未配置可用 AI 模型，该工作流暂不可用')
})
```

- [ ] **Step 4: 跑本次新增测试集合**

Run: `npm test -- src/lib/utils/workflowAccess.test.ts src/pages/__tests__/Chat.localWorkflowMode.test.tsx api/__tests__/WorkflowExecutionService.local-mode.test.ts --runInBand`

Expected: PASS，覆盖本地工作流模式的前后端行为。

- [ ] **Step 5: 运行总类型检查**

Run: `npm run typecheck`

Expected: PASS，前后端与共享类型一致。

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/workflowAccess.test.ts src/pages/__tests__/Chat.localWorkflowMode.test.tsx api/__tests__/WorkflowExecutionService.local-mode.test.ts
git commit -m "test: cover local workflow only mode"
```

### Task 7: 手工回归与文案收尾

**Files:**
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/pages/Config.tsx`
- Modify: `/Users/shibo/Documents/trae_projects/AINews/src/pages/Chat.tsx`

- [ ] **Step 1: 手工走通“跳过 AI 配置”路径**

Run: `npm run dev`

Expected:
- 配置页能看到“立即配置 AI / 跳过，先用本地工作流”
- 点击跳过后切到“已启用本地工作流模式”

- [ ] **Step 2: 手工走通聊天页受限路径**

Expected:
- 普通自然语言输入返回系统引导消息
- `+` 菜单和工作流建议里只剩 `/个税报表`
- `/新闻推送` 不再显示

- [ ] **Step 3: 手工走通 `/个税报表` 执行路径**

Expected:
- 未配 AI 时，`/个税报表` 仍可正常上传和执行

- [ ] **Step 4: 细调文案，确保与设计一致**

```ts
'当前未配置 AI 模型，无法使用 AI 进行沟通，请前往【设置】中的【系统配置】配置 AI 模型。'
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Config.tsx src/pages/Chat.tsx
git commit -m "chore: polish local workflow only guidance"
```
