type ChatHistoryItem = {
  role: 'user' | 'assistant'
  content: string
}

type ReferenceNews = {
  title: string
  content: string
  source?: string
  publishedAt?: string
  url?: string
}

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
}

export function clampContextBlock(value: string, maxChars: number) {
  const normalized = normalizeWhitespace(value)
  if (normalized.length <= maxChars) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`
}

function buildOlderSummary(history: ChatHistoryItem[], maxSummaryChars: number) {
  if (history.length === 0) {
    return ''
  }

  const summaryLines = history.map((item) => {
    const label = item.role === 'user' ? '用户' : '助手'
    return `- ${label}：${clampContextBlock(item.content, 70)}`
  })

  return clampContextBlock(summaryLines.join('\n'), maxSummaryChars)
}

export function buildBoundedHistorySection(
  history: ChatHistoryItem[] = [],
  options?: {
    preserveRecentMessages?: number
    maxMessageChars?: number
    maxSummaryChars?: number
  }
) {
  if (!history.length) {
    return ''
  }

  const preserveRecentMessages = options?.preserveRecentMessages ?? 8
  const maxMessageChars = options?.maxMessageChars ?? 360
  const maxSummaryChars = options?.maxSummaryChars ?? 420

  const olderMessages = history.slice(0, Math.max(0, history.length - preserveRecentMessages))
  const recentMessages = history.slice(-preserveRecentMessages)

  const sections: string[] = []

  if (olderMessages.length > 0) {
    sections.push(`较早对话摘要：\n${buildOlderSummary(olderMessages, maxSummaryChars)}`)
  }

  const recentSection = recentMessages
    .map((item) => `${item.role === 'user' ? '用户' : '助手'}：${clampContextBlock(item.content, maxMessageChars)}`)
    .join('\n')

  sections.push(`最近对话记录：\n${recentSection}`)

  return `${sections.join('\n\n')}\n\n`
}

export function buildBoundedReferenceSection(news: ReferenceNews, maxChars: number) {
  const sections = [
    `引用新闻标题：${news.title}`,
    news.source ? `引用新闻来源：${news.source}` : '',
    news.publishedAt ? `引用新闻发布时间：${news.publishedAt}` : '',
    news.url ? `引用新闻原文：${news.url}` : '',
    `引用新闻内容：${clampContextBlock(news.content, Math.max(80, maxChars - 120))}`,
  ].filter(Boolean)

  return clampContextBlock(sections.join('\n'), maxChars)
}
