import { buildBoundedHistorySection, buildBoundedReferenceSection, clampContextBlock } from '../services/chatContext'

describe('chat context budget helpers', () => {
  test('buildBoundedHistorySection should summarize older messages and keep recent turns', () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `第 ${index + 1} 条消息：${'内容'.repeat(120)}`,
    }))

    const result = buildBoundedHistorySection(history, {
      preserveRecentMessages: 4,
      maxMessageChars: 60,
      maxSummaryChars: 160,
    })

    expect(result).toContain('较早对话摘要')
    expect(result).toContain('最近对话记录')
    expect(result).toContain('第 10 条消息')
    expect(result).not.toContain('内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容内容')
  })

  test('buildBoundedReferenceSection should keep title and truncate long article body', () => {
    const result = buildBoundedReferenceSection({
      title: '测试标题',
      content: '原文'.repeat(800),
      source: 'IT之家',
      publishedAt: '2026-04-21T10:00:00.000Z',
    }, 240)

    expect(result).toContain('引用新闻标题：测试标题')
    expect(result.length).toBeLessThanOrEqual(320)
    expect(result).toContain('原文')
  })

  test('clampContextBlock should cut oversized workspace context', () => {
    const result = clampContextBlock(`工程文件夹上下文：${'文件摘要'.repeat(400)}`, 180)

    expect(result.length).toBeLessThanOrEqual(200)
    expect(result.endsWith('...')).toBe(true)
  })
})
