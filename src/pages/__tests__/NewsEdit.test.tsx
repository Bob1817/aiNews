import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { NewsEdit } from '../NewsEdit'
import { useAppStore } from '@/store'

jest.mock('@/lib/api/categories', () => ({
  getCategories: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/api/news', () => ({
  createSavedNews: jest.fn(),
  updateSavedNews: jest.fn(),
  publishNews: jest.fn(),
}))

jest.mock('@/components/ArticleContent', () => ({
  ArticleContent: ({ content }: { content: string }) => <div>{content}</div>,
}))

jest.mock('@/lib/toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}))

describe('NewsEdit', () => {
  beforeEach(() => {
    useAppStore.setState({
      savedNews: [
        {
          id: 'n-1',
          userId: '1',
          title: '测试标题',
          content: '<p>已有新闻正文</p>',
          contentFormat: 'html',
          isPublished: false,
          publishedTo: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    })
  })

  test('进入编辑页时显示已有新闻正文', async () => {
    render(
      <MemoryRouter initialEntries={['/news/edit/n-1']}>
        <Routes>
          <Route path="/news/edit/:id" element={<NewsEdit />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('已有新闻正文')).toBeInTheDocument()
    })
  })
})
