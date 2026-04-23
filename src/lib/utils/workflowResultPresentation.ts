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

const TAX_REPORT_STAT_LABELS = ['识别发放记录表', '识别结算发放表', '合并人员数量'] as const
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g

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
  const trimmedLines = getTrimmedLines(content)
  if (!trimmedLines.length) {
    return null
  }

  const actions = extractMarkdownActions(content)
  if (!actions.length) {
    return null
  }

  const titleLine = trimmedLines.find((line) => line.includes('成功') || line.includes('失败')) ?? trimmedLines[0]
  const title = stripMarkdownHeading(titleLine)
  const stats = TAX_REPORT_STAT_LABELS.map((label) => ({
    label,
    value: extractLabeledValue(trimmedLines, label) ?? '0.00',
  }))

  const description = trimmedLines.find((line) => {
    if (stripMarkdownHeading(line) === title) {
      return false
    }

    if (line.startsWith('- ') || line.startsWith('[')) {
      return false
    }

    return !TAX_REPORT_STAT_LABELS.some((label) => line.includes(label))
  })

  return {
    kind: 'tax-report',
    title,
    description,
    stats,
    actions,
  }
}

function parseNewsDigestPresentation(content: string): NewsDigestPresentation | null {
  const lines = content.split('\n')
  const headerTitle = stripMarkdownHeading(
    lines.find((line) => stripMarkdownHeading(line.trim()) === '新闻推送简报')?.trim() ?? '新闻推送简报'
  )
  const keywordLine = lines.find((line) => line.includes('本次爬虫关键词'))?.trim()
  const focusLine = lines.find((line) => line.includes('对话输入关注点'))?.trim()
  const blocks = content
    .split(/\n(?=(?:##\s*)?\d+\.\s)/)
    .filter((block) => /^(?:##\s*)?\d+\.\s/.test(block.trim()))

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

function parseNewsItemBlock(block: string, fallbackIndex: number): NewsDigestItemPresentation | null {
  const lines = getTrimmedLines(block)
  const titleLine = lines[0]
  if (!titleLine) {
    return null
  }

  const normalizedTitleLine = stripMarkdownHeading(titleLine)
  const titleMatch = normalizedTitleLine.match(/^(\d+)\.\s*(.+)$/)
  const index = titleMatch ? Number.parseInt(titleMatch[1], 10) : fallbackIndex
  const title = titleMatch ? titleMatch[2].trim() : normalizedTitleLine
  if (!title) {
    return null
  }

  const summary = lines
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^-+\s*/, '').trim())
    .filter((line) => {
      return !['来源：', '发布时间：', '原文：', '关键词：'].some((prefix) => line.startsWith(prefix))
    })

  return {
    index,
    title,
    source: extractLabeledValue(lines, '来源'),
    publishedAt: extractLabeledValue(lines, '发布时间'),
    keyword: extractLabeledValue(lines, '关键词'),
    summary,
    actions: extractMarkdownActions(extractOperationLine(block) ?? ''),
    link: extractMarkdownHref(block, '点击查看原文'),
  }
}

function getTrimmedLines(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function extractLabeledValue(lines: string[], label: string): string | undefined {
  const normalizedPrefix = `${label}：`
  const line = lines.find((entry) => entry.replace(/^-+\s*/, '').startsWith(normalizedPrefix))
  if (!line) {
    return undefined
  }

  return line
    .replace(/^-+\s*/, '')
    .slice(normalizedPrefix.length)
    .replace(MARKDOWN_LINK_PATTERN, '$1')
    .trim()
}

function extractMarkdownActions(content: string): WorkflowActionLink[] {
  const actions: WorkflowActionLink[] = []

  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const [, label, target] = match
    if (target.startsWith('action:')) {
      actions.push({
        label,
        action: target.slice('action:'.length),
      })
      continue
    }

    actions.push({
      label,
      href: target,
    })
  }

  return actions
}

function extractMarkdownHref(content: string, label: string): string | undefined {
  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const [, currentLabel, target] = match
    if (currentLabel === label && !target.startsWith('action:')) {
      return target
    }
  }

  return undefined
}

function extractOperationLine(content: string): string | undefined {
  return content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('操作：'))
}

function stripMarkdownHeading(value: string) {
  return value.replace(/^#{1,6}\s*/, '').trim()
}
