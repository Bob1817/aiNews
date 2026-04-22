# Workflow Result UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为聊天页中的 `新闻推送` 和 `个税报表` 工作流结果提供专属结果卡片，替换当前通用 Markdown 长文展示。

**Architecture:** 在前端新增一层“工作流结果展示模型”，先用纯函数从 `ConversationMessage` 的 `workflowInvocation` 和 `content` 中解析出视图数据，再由 `ConversationItem` 分发到专属结果卡片组件。未命中或解析失败的消息继续回退到 `MarkdownRenderer`，避免影响普通 AI 回答。

**Tech Stack:** React 18、TypeScript、Tailwind CSS、Jest、Testing Library

---

### Task 1: 建立工作流结果解析模型

**Files:**
- Create: `src/lib/utils/workflowResultPresentation.ts`
- Test: `src/lib/utils/workflowResultPresentation.test.ts`

- [ ] **Step 1: 写解析层失败测试**

```ts
import { describe, expect, test } from '@jest/globals'
import { parseWorkflowResultPresentation } from './workflowResultPresentation'
import type { ConversationMessage } from '@/types'

const baseMessage: ConversationMessage = {
  id: 'assistant-1',
  role: 'assistant',
  content: '',
  timestamp: '2026-04-22T08:00:00.000Z',
}

describe('parseWorkflowResultPresentation', () => {
  test('returns tax report presentation for /个税报表 result text', () => {
    const message: ConversationMessage = {
      ...baseMessage,
      workflowInvocation: '/个税报表',
      content: [
        '合并数据成功',
        '',
        '- 识别发放记录表：1 个',
        '- 识别结算发放表：1 个',
        '- 合并人员数量：2 人',
        '',
        '[下载合并结果](https://example.com/output.xlsx) [查看 output 文件夹](action:open-output-folder)',
      ].join('\n'),
    }

    const result = parseWorkflowResultPresentation(message)

    expect(result?.kind).toBe('tax-report')
    expect(result?.title).toBe('合并数据成功')
    expect(result?.stats).toEqual([
      { label: '识别发放记录表', value: '1 个' },
      { label: '识别结算发放表', value: '1 个' },
      { label: '合并人员数量', value: '2 人' },
    ])
  })

  test('returns news digest presentation for /新闻推送 digest text', () => {
    const message: ConversationMessage = {
      ...baseMessage,
      workflowInvocation: '/新闻推送',
      content: [
        '新闻推送简报',
        '',
        '本次爬虫关键词：AI、人工智能',
        '对话输入关注点：推送一些 AI 相关新闻',
        '',
        '1. 第一条新闻标题',
        '',
        '- 来源：IT之家',
        '- 发布时间：22 分钟前',
        '- 原文：[点击查看原文](https://example.com/news-1)',
        '- 关键词：AI',
        '',
        '摘要：',
        '',
        '- 第一段摘要',
        '- 第二段摘要',
        '',
        '操作：[保存](action:save-news-1) [引用](action:quote-news-1)',
      ].join('\n'),
    }

    const result = parseWorkflowResultPresentation(message)

    expect(result?.kind).toBe('news-digest')
    expect(result?.headerTitle).toBe('新闻推送简报')
    expect(result?.items).toHaveLength(1)
    expect(result?.items[0]).toMatchObject({
      title: '第一条新闻标题',
      source: 'IT之家',
      publishedAt: '22 分钟前',
      keyword: 'AI',
    })
  })

  test('returns null for non-workflow assistant message', () => {
    const result = parseWorkflowResultPresentation({
      ...baseMessage,
      content: '普通回答内容',
    })

    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/lib/utils/workflowResultPresentation.test.ts --runInBand`

Expected: FAIL with `Cannot find module './workflowResultPresentation'`

- [ ] **Step 3: 写最小解析实现**

```ts
import type { ConversationMessage } from '@/types'

export interface WorkflowActionLink {
  label: string
  href?: string
  action?: string
}

export interface WorkflowStat {
  label: string
  value: string
}

export interface TaxReportPresentation {
  kind: 'tax-report'
  title: string
  description?: string
  stats: WorkflowStat[]
  actions: WorkflowActionLink[]
}

export interface NewsDigestItemPresentation {
  index: number
  title: string
  source?: string
  publishedAt?: string
  keyword?: string
  summary: string[]
  actions: WorkflowActionLink[]
  link?: string
}

export interface NewsDigestPresentation {
  kind: 'news-digest'
  headerTitle: string
  keywordLine?: string
  focusLine?: string
  items: NewsDigestItemPresentation[]
}

export type WorkflowResultPresentation = TaxReportPresentation | NewsDigestPresentation

export function parseWorkflowResultPresentation(
  message: ConversationMessage
): WorkflowResultPresentation | null {
  if (message.workflowInvocation === '/个税报表') {
    return parseTaxReportPresentation(message.content)
  }

  if (message.workflowInvocation === '/新闻推送') {
    return parseNewsDigestPresentation(message.content)
  }

  return null
}

function parseTaxReportPresentation(content: string): TaxReportPresentation | null {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean)
  const title = lines.find((line) => line.includes('合并数据成功')) ?? '合并数据成功'
  const statMatchers = ['识别发放记录表', '识别结算发放表', '合并人员数量']
  const stats = statMatchers.map((label) => {
    const line = lines.find((entry) => entry.includes(label))
    const value = line?.split('：').slice(1).join('：').replace(/^-+\s*/, '').trim() || '--'
    return { label, value }
  })
  const actions = extractMarkdownActions(content)

  if (!actions.length) {
    return null
  }

  return {
    kind: 'tax-report',
    title,
    description: lines.find((line) => line !== title && !line.startsWith('- ')),
    stats,
    actions,
  }
}

function parseNewsDigestPresentation(content: string): NewsDigestPresentation | null {
  const lines = content.split('\n')
  const headerTitle = lines.find((line) => line.trim() === '新闻推送简报') ?? '新闻推送简报'
  const keywordLine = lines.find((line) => line.includes('本次爬虫关键词'))
  const focusLine = lines.find((line) => line.includes('对话输入关注点'))
  const blocks = content.split(/\n(?=\d+\.)/).slice(1)
  const items = blocks
    .map((block, index) => parseNewsItemBlock(block, index + 1))
    .filter((item): item is NewsDigestItemPresentation => item !== null)

  if (!items.length) {
    return null
  }

  return {
    kind: 'news-digest',
    headerTitle,
    keywordLine,
    focusLine,
    items,
  }
}

function parseNewsItemBlock(block: string, index: number): NewsDigestItemPresentation | null {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
  const titleLine = lines[0]
  const title = titleLine.replace(/^\d+\.\s*/, '')
  if (!title) {
    return null
  }

  return {
    index,
    title,
    source: extractLabeledValue(lines, '来源'),
    publishedAt: extractLabeledValue(lines, '发布时间'),
    keyword: extractLabeledValue(lines, '关键词'),
    summary: lines.filter((line) => line.startsWith('- ') && !line.includes('来源：') && !line.includes('发布时间：') && !line.includes('关键词：')).map((line) => line.replace(/^-+\s*/, '')),
    actions: extractMarkdownActions(block),
    link: extractMarkdownHref(block, '点击查看原文'),
  }
}

function extractLabeledValue(lines: string[], label: string): string | undefined {
  const line = lines.find((entry) => entry.includes(`${label}：`))
  return line?.split('：').slice(1).join('：').trim()
}

function extractMarkdownHref(content: string, label: string): string | undefined {
  const match = content.match(new RegExp(`\\\\[${label}\\\\]\\\\(([^)]+)\\\\)`))
  return match?.[1]
}

function extractMarkdownActions(content: string): WorkflowActionLink[] {
  return [...content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((match) => ({
    label: match[1],
    href: match[2].startsWith('action:') ? undefined : match[2],
    action: match[2].startsWith('action:') ? match[2].replace(/^action:/, '') : undefined,
  }))
}
```

- [ ] **Step 4: 运行解析测试确认通过**

Run: `npm test -- src/lib/utils/workflowResultPresentation.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/workflowResultPresentation.ts src/lib/utils/workflowResultPresentation.test.ts
git commit -m "feat: add workflow result presentation parser"
```

### Task 2: 为两个工作流添加专属结果卡片组件

**Files:**
- Create: `src/components/workflow-results/WorkflowResultCard.tsx`
- Create: `src/components/workflow-results/TaxReportResultCard.tsx`
- Create: `src/components/workflow-results/NewsDigestResultCard.tsx`
- Modify: `src/types/index.ts`
- Test: `src/components/__tests__/WorkflowResultCard.test.tsx`

- [ ] **Step 1: 写组件渲染失败测试**

```tsx
import { render, screen } from '@testing-library/react'
import { WorkflowResultCard } from '../workflow-results/WorkflowResultCard'
import type { TaxReportPresentation, NewsDigestPresentation } from '@/lib/utils/workflowResultPresentation'

describe('WorkflowResultCard', () => {
  test('renders tax report stats and primary actions', () => {
    const presentation: TaxReportPresentation = {
      kind: 'tax-report',
      title: '合并数据成功',
      stats: [
        { label: '识别发放记录表', value: '1 个' },
        { label: '识别结算发放表', value: '1 个' },
        { label: '合并人员数量', value: '2 人' },
      ],
      actions: [
        { label: '下载合并结果', href: 'https://example.com/output.xlsx' },
        { label: '查看 output 文件夹', action: 'open-output-folder' },
      ],
    }

    render(<WorkflowResultCard presentation={presentation} />)

    expect(screen.getByText('合并数据成功')).toBeInTheDocument()
    expect(screen.getByText('识别发放记录表')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '下载合并结果' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看 output 文件夹' })).toBeInTheDocument()
  })

  test('renders digest article cards with metadata and actions', () => {
    const presentation: NewsDigestPresentation = {
      kind: 'news-digest',
      headerTitle: '新闻推送简报',
      keywordLine: '本次爬虫关键词：AI、人工智能',
      focusLine: '对话输入关注点：推送一些 AI 相关新闻',
      items: [
        {
          index: 1,
          title: '第一条新闻标题',
          source: 'IT之家',
          publishedAt: '22 分钟前',
          keyword: 'AI',
          summary: ['第一段摘要', '第二段摘要'],
          link: 'https://example.com/news-1',
          actions: [
            { label: '保存', action: 'save-news-1' },
            { label: '引用', action: 'quote-news-1' },
          ],
        },
      ],
    }

    render(<WorkflowResultCard presentation={presentation} />)

    expect(screen.getByText('新闻推送简报')).toBeInTheDocument()
    expect(screen.getByText('第一条新闻标题')).toBeInTheDocument()
    expect(screen.getByText('IT之家')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '引用' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/components/__tests__/WorkflowResultCard.test.tsx --runInBand`

Expected: FAIL with `Cannot find module '../workflow-results/WorkflowResultCard'`

- [ ] **Step 3: 实现工作流结果卡片组件**

```tsx
import type { NewsDigestPresentation, TaxReportPresentation, WorkflowResultPresentation } from '@/lib/utils/workflowResultPresentation'

interface WorkflowResultCardProps {
  presentation: WorkflowResultPresentation
  onActionClick?: (action: string) => void
}

export function WorkflowResultCard({ presentation, onActionClick }: WorkflowResultCardProps) {
  if (presentation.kind === 'tax-report') {
    return <TaxReportResultCard presentation={presentation} onActionClick={onActionClick} />
  }

  return <NewsDigestResultCard presentation={presentation} onActionClick={onActionClick} />
}

function TaxReportResultCard({
  presentation,
  onActionClick,
}: {
  presentation: TaxReportPresentation
  onActionClick?: (action: string) => void
}) {
  return (
    <section className="w-full rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            个税结果
          </span>
          <h3 className="mt-3 text-[28px] font-semibold tracking-[-0.02em] text-slate-900">
            {presentation.title}
          </h3>
          {presentation.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">{presentation.description}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {presentation.stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {presentation.actions.map((action, index) =>
          action.href ? (
            <a
              key={`${action.label}-${index}`}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {action.label}
            </a>
          ) : (
            <button
              key={`${action.label}-${index}`}
              type="button"
              onClick={() => action.action && onActionClick?.(action.action)}
              className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {action.label}
            </button>
          )
        )}
      </div>
    </section>
  )
}

function NewsDigestResultCard({
  presentation,
  onActionClick,
}: {
  presentation: NewsDigestPresentation
  onActionClick?: (action: string) => void
}) {
  return (
    <section className="w-full rounded-[30px] border border-stone-200 bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="border-b border-stone-200 pb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">News Digest</p>
        <h3 className="mt-2 font-['Newsreader'] text-[30px] leading-none text-slate-900">
          {presentation.headerTitle}
        </h3>
        {presentation.keywordLine ? <p className="mt-3 text-sm text-slate-600">{presentation.keywordLine}</p> : null}
        {presentation.focusLine ? <p className="mt-1 text-sm text-slate-600">{presentation.focusLine}</p> : null}
      </div>
      <div className="mt-5 space-y-4">
        {presentation.items.map((item) => (
          <article key={item.index} className="rounded-[24px] border border-stone-200 bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Article {item.index}</p>
                <h4 className="mt-2 font-['Newsreader'] text-[26px] leading-8 text-slate-900">{item.title}</h4>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              {item.source ? <span className="rounded-full bg-stone-100 px-3 py-1">{item.source}</span> : null}
              {item.publishedAt ? <span className="rounded-full bg-stone-100 px-3 py-1">{item.publishedAt}</span> : null}
              {item.keyword ? <span className="rounded-full bg-stone-100 px-3 py-1">{item.keyword}</span> : null}
            </div>
            <div className="mt-4 space-y-2 text-[15px] leading-7 text-slate-700">
              {item.summary.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-stone-50 px-4 text-sm font-medium text-slate-700 transition hover:bg-stone-100"
                >
                  查看原文
                </a>
              ) : null}
              {item.actions.map((action, index) => (
                <button
                  key={`${action.label}-${index}`}
                  type="button"
                  onClick={() => action.action && onActionClick?.(action.action)}
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 运行组件测试确认通过**

Run: `npm test -- src/components/__tests__/WorkflowResultCard.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/workflow-results/WorkflowResultCard.tsx src/components/workflow-results/TaxReportResultCard.tsx src/components/workflow-results/NewsDigestResultCard.tsx src/components/__tests__/WorkflowResultCard.test.tsx src/types/index.ts
git commit -m "feat: add workflow result card components"
```

### Task 3: 接入 ConversationItem 分发逻辑并保留 Markdown 回退

**Files:**
- Modify: `src/components/ConversationItem.tsx`
- Modify: `src/components/MarkdownRenderer.tsx`
- Test: `src/components/__tests__/ConversationItem.workflow-results.test.tsx`

- [ ] **Step 1: 写集成失败测试**

```tsx
import { render, screen } from '@testing-library/react'
import { ConversationItem } from '../ConversationItem'
import type { ConversationMessage } from '@/types'

const assistantMessage = (workflowInvocation: string, content: string): ConversationMessage => ({
  id: `${workflowInvocation}-message`,
  role: 'assistant',
  workflowInvocation,
  content,
  timestamp: '2026-04-22T08:00:00.000Z',
})

describe('ConversationItem workflow results', () => {
  test('renders tax report card instead of markdown bullets', () => {
    render(
      <ConversationItem
        message={assistantMessage(
          '/个税报表',
          '合并数据成功\\n\\n- 识别发放记录表：1 个\\n- 识别结算发放表：1 个\\n- 合并人员数量：2 人\\n\\n[查看 output 文件夹](action:open-output-folder)'
        )}
      />
    )

    expect(screen.getByText('合并数据成功')).toBeInTheDocument()
    expect(screen.queryByText('•')).not.toBeInTheDocument()
  })

  test('falls back to markdown renderer for regular assistant content', () => {
    render(
      <ConversationItem
        message={assistantMessage('/普通消息', '## 普通标题\\n\\n普通正文')}
      />
    )

    expect(screen.getByRole('heading', { name: '普通标题' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/components/__tests__/ConversationItem.workflow-results.test.tsx --runInBand`

Expected: FAIL because `ConversationItem` still renders Markdown for workflow messages

- [ ] **Step 3: 在 ConversationItem 中接入解析和卡片渲染**

```tsx
import { parseWorkflowResultPresentation } from '@/lib/utils/workflowResultPresentation'
import { WorkflowResultCard } from './workflow-results/WorkflowResultCard'

const presentation = !isUser ? parseWorkflowResultPresentation(message) : null

<div className="flex items-end gap-3">
  <div className="w-full min-w-0">
    {presentation ? (
      <WorkflowResultCard
        presentation={presentation}
        onActionClick={onMarkdownAction}
      />
    ) : (
      <div className="rounded-[22px] rounded-tl-md border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
        <MarkdownRenderer
          content={message.content}
          className="text-[15px] leading-7 text-slate-800"
          onCommandClick={onForwardToInput}
          onActionClick={onMarkdownAction}
        />
      </div>
    )}
  </div>
  {actionColumn}
</div>
```

如需清理 `MarkdownRenderer`，只做最小改动：保留普通消息排版，不再承担工作流专属按钮样式职责。

- [ ] **Step 4: 运行集成测试确认通过**

Run: `npm test -- src/components/__tests__/ConversationItem.workflow-results.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ConversationItem.tsx src/components/MarkdownRenderer.tsx src/components/__tests__/ConversationItem.workflow-results.test.tsx
git commit -m "feat: render workflow-specific result cards in conversation"
```

### Task 4: 跑完整验证并做界面回归检查

**Files:**
- Modify: `docs/superpowers/plans/2026-04-22-workflow-result-ui.md`

- [ ] **Step 1: 运行前端相关测试**

Run: `npm test -- src/lib/utils/workflowResultPresentation.test.ts src/components/__tests__/WorkflowResultCard.test.tsx src/components/__tests__/ConversationItem.workflow-results.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: 手动验证聊天页**

Run: `npm run dev`

Manually verify:

- `/个税报表` 结果显示为单张统计卡片
- `/新闻推送` 结果显示为简报头 + 多条 article card
- `下载合并结果`、`查看 output 文件夹`、`保存`、`引用` 仍然可点击
- 工作流标签仍显示在头像旁
- 普通 assistant 消息样式没有退化

- [ ] **Step 4: 更新计划勾选状态并记录验证结果**

```md
- [x] Step 1: 运行前端相关测试
- [x] Step 2: 运行类型检查
- [x] Step 3: 手动验证聊天页
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-04-22-workflow-result-ui.md
git commit -m "docs: record workflow result UI verification"
```

## Self-Review

### Spec coverage

- `个税报表` 专属结果卡：Task 1、Task 2、Task 3
- `新闻推送` article card 化：Task 1、Task 2、Task 3
- 保留聊天壳子、工作流标签、更多菜单：Task 3
- 解析失败回退 Markdown：Task 1、Task 3
- 测试与手动回归：Task 4

### Placeholder scan

- 无 `TBD`、`TODO` 或“稍后实现”描述
- 每个改动任务都带了示例代码和验证命令

### Type consistency

- 统一使用 `parseWorkflowResultPresentation`
- 统一使用 `WorkflowResultCard`
- 统一使用 `TaxReportPresentation` / `NewsDigestPresentation`
