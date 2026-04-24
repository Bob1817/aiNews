import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { NewsEdit } from '../NewsEdit'
import { useAppStore } from '@/store'

const createSavedNews = jest.fn()
const getSavedNews = jest.fn()
const updateSavedNews = jest.fn()
const publishNews = jest.fn()
const uploadWorkspaceAsset = jest.fn()

jest.mock('@/lib/api/categories', () => ({
  getCategories: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/api/news', () => ({
  createSavedNews: (...args: unknown[]) => createSavedNews(...args),
  getSavedNews: (...args: unknown[]) => getSavedNews(...args),
  updateSavedNews: (...args: unknown[]) => updateSavedNews(...args),
  publishNews: (...args: unknown[]) => publishNews(...args),
}))

jest.mock('@/lib/api/config', () => ({
  uploadWorkspaceAsset: (...args: unknown[]) => uploadWorkspaceAsset(...args),
}))

const mockConvertContentToHtml = jest.fn()
const mockGetContentExcerpt = jest.fn()

jest.mock('@/lib/utils/contentFormat', () => ({
  convertContentToHtml: (...args: unknown[]) => mockConvertContentToHtml(...args),
  getContentExcerpt: (...args: unknown[]) => mockGetContentExcerpt(...args),
}))

jest.mock('@/components/ArticleContent', () => ({
  ArticleContent: ({ content }: { content: string }) => <div>{content}</div>,
}))

jest.mock('@/components/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
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

    getSavedNews.mockResolvedValue([
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
    ])

    mockConvertContentToHtml.mockImplementation((content) => content)
    mockGetContentExcerpt.mockReturnValue('')
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