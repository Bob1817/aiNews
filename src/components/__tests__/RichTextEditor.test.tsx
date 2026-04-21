import { render, screen, waitFor } from '@testing-library/react'
import { RichTextEditor } from '../RichTextEditor'

describe('RichTextEditor', () => {
  test('首次挂载时显示初始内容', async () => {
    render(
      <RichTextEditor value="<p>已加载的新闻正文</p>" onChange={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getByText('已加载的新闻正文')).toBeInTheDocument()
    })
  })
})
