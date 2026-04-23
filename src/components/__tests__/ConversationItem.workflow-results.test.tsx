jest.mock('@/lib/toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}))

jest.mock('../MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown-renderer">{content}</div>,
}))

import { render, screen } from '@testing-library/react'

import type { ConversationMessage } from '@/types'

import { ConversationItem } from '../ConversationItem'

const assistantMessage = (
  workflowInvocation: string | undefined,
  content: string
): ConversationMessage => ({
  id: `${workflowInvocation ?? 'plain'}-message`,
  role: 'assistant',
  workflowInvocation,
  content,
  timestamp: '2026-04-22T08:00:00.000Z',
})

describe('ConversationItem workflow results', () => {
  test('renders tax report card instead of markdown list', () => {
    render(
      <ConversationItem
        message={assistantMessage(
          '/个税报表',
          [
            '合并数据成功',
            '',
            '- 识别发放记录表：1 个',
            '- 识别结算发放表：1 个',
            '- 合并人员数量：2 人',
            '',
            '[查看 output 文件夹](action:open-output-folder:encoded-payload)',
          ].join('\n')
        )}
      />
    )

    expect(screen.getByText('合并数据成功')).toBeInTheDocument()
    expect(screen.getByText('识别发放记录表')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看 output 文件夹' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('falls back to markdown renderer for regular assistant content', () => {
    render(
      <ConversationItem
        message={assistantMessage(undefined, '## 普通标题\n\n普通正文')}
      />
    )

    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('## 普通标题')
    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('普通正文')
  })
})
