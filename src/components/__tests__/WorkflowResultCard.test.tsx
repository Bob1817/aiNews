import { fireEvent, render, screen } from '@testing-library/react'
import { WorkflowResultCard } from '../workflow-results/WorkflowResultCard'
import type { WorkflowResultPresentation } from '@/lib/utils/workflowResultPresentation'

describe('WorkflowResultCard', () => {
  test('渲染个税报表结果卡并触发动作按钮', () => {
    const handleActionClick = jest.fn()
    const presentation: WorkflowResultPresentation = {
      kind: 'tax-report',
      title: '合并数据成功',
      description: '本次按固定模板生成标准个税申报表。',
      stats: [
        { label: '识别发放记录表', value: '1 个' },
        { label: '识别结算发放表', value: '1 个' },
        { label: '合并人员数量', value: '2 人' },
      ],
      actions: [
        { label: '下载结果', href: '/downloads/result.xlsx' },
        { label: '查看 output 文件夹', action: 'open-output-folder' },
      ],
    }

    render(<WorkflowResultCard presentation={presentation} onActionClick={handleActionClick} />)

    expect(screen.getByText('合并数据成功')).toBeInTheDocument()
    expect(screen.getByText('识别发放记录表')).toBeInTheDocument()
    expect(screen.getByText('2 人')).toBeInTheDocument()

    const downloadLink = screen.getByRole('link', { name: '下载结果' })
    expect(downloadLink).toHaveAttribute('href', '/downloads/result.xlsx')

    fireEvent.click(screen.getByRole('button', { name: '查看 output 文件夹' }))
    expect(handleActionClick).toHaveBeenCalledWith('open-output-folder')
  })

  test('渲染新闻简报结果卡并展示摘要与操作', () => {
    const handleActionClick = jest.fn()
    const presentation: WorkflowResultPresentation = {
      kind: 'news-digest',
      headerTitle: '新闻推送简报',
      keywordLine: '本次爬虫关键词：AI，人工智能',
      focusLine: '对话输入关注点：推送一些 AI 相关新闻',
      items: [
        {
          index: 1,
          title: 'Yeelight 智能恒温浴霸 M3 开启众筹',
          source: 'IT之家',
          publishedAt: '22 分钟前',
          keyword: 'AI',
          summary: ['换气效率达 200m³/h。', '支持小米米家 App 联动。'],
          link: 'https://example.com/article-1',
          actions: [
            { label: '保存', action: 'save-news:1' },
            { label: '引用', action: 'quote-news:1' },
          ],
        },
      ],
    }

    render(<WorkflowResultCard presentation={presentation} onActionClick={handleActionClick} />)

    expect(screen.getByText('新闻推送简报')).toBeInTheDocument()
    expect(screen.getByText('Yeelight 智能恒温浴霸 M3 开启众筹')).toBeInTheDocument()
    expect(screen.getByText('换气效率达 200m³/h。')).toBeInTheDocument()

    const originalLink = screen.getByRole('link', { name: '查看原文' })
    expect(originalLink).toHaveAttribute('href', 'https://example.com/article-1')

    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    fireEvent.click(screen.getByRole('button', { name: '引用' }))

    expect(handleActionClick).toHaveBeenNthCalledWith(1, 'save-news:1')
    expect(handleActionClick).toHaveBeenNthCalledWith(2, 'quote-news:1')
  })
})
