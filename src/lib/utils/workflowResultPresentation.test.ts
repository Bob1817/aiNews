import { describe, expect, test } from '@jest/globals'

import type { ConversationMessage } from '@/types'

import { parseWorkflowResultPresentation } from './workflowResultPresentation'

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
        '# 合并数据成功',
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
    expect(result).not.toBeNull()
    if (result?.kind !== 'tax-report') {
      throw new Error('Expected tax-report presentation')
    }

    expect(result.title).toBe('合并数据成功')
    expect(result.stats).toEqual([
      { label: '识别发放记录表', value: '1 个' },
      { label: '识别结算发放表', value: '1 个' },
      { label: '合并人员数量', value: '2 人' },
    ])
    expect(result.actions).toEqual([
      { label: '下载合并结果', href: 'https://example.com/output.xlsx' },
      { label: '查看 output 文件夹', action: 'open-output-folder' },
    ])
  })

  test('returns news digest presentation for /新闻推送 digest text', () => {
    const message: ConversationMessage = {
      ...baseMessage,
      workflowInvocation: '/新闻推送',
      content: [
        '# 新闻推送简报',
        '',
        '本次爬虫关键词：AI、人工智能',
        '对话输入关注点：推送一些 AI 相关新闻',
        '',
        '## 1. 第一条新闻标题',
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
    expect(result).not.toBeNull()
    if (result?.kind !== 'news-digest') {
      throw new Error('Expected news-digest presentation')
    }

    expect(result.headerTitle).toBe('新闻推送简报')
    expect(result.keywordLine).toBe('本次爬虫关键词：AI、人工智能')
    expect(result.focusLine).toBe('对话输入关注点：推送一些 AI 相关新闻')
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      index: 1,
      title: '第一条新闻标题',
      source: 'IT之家',
      publishedAt: '22 分钟前',
      keyword: 'AI',
      summary: ['第一段摘要', '第二段摘要'],
      link: 'https://example.com/news-1',
    })
    expect(result.items[0].actions).toEqual([
      { label: '保存', action: 'save-news-1' },
      { label: '引用', action: 'quote-news-1' },
    ])
  })

  test('returns null for non-workflow assistant message', () => {
    const result = parseWorkflowResultPresentation({
      ...baseMessage,
      content: '普通回答内容',
    })

    expect(result).toBeNull()
  })
})
