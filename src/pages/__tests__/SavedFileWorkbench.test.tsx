import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewsList } from '../NewsList'
import { SavedFileWorkbench } from '../SavedFileWorkbench'
import { useAppStore } from '@/store'

const getSavedWorkbook = jest.fn()
const updateSavedWorkbook = jest.fn()
const deleteNews = jest.fn()
const downloadSavedFile = jest.fn()
const getSavedNews = jest.fn()

jest.mock('@/lib/api/categories', () => ({
  getCategories: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/api/news', () => ({
  getSavedNews: (...args: unknown[]) => getSavedNews(...args),
  deleteNews: (...args: unknown[]) => deleteNews(...args),
  downloadSavedFile: (...args: unknown[]) => downloadSavedFile(...args),
  getSavedWorkbook: (...args: unknown[]) => getSavedWorkbook(...args),
  updateSavedWorkbook: (...args: unknown[]) => updateSavedWorkbook(...args),
}))

jest.mock('@/components/ArticleContent', () => ({
  ArticleContent: ({ content }: { content: string }) => <div>{content}</div>,
}))

jest.mock('@/lib/toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}))

describe('saved xlsx file workbench', () => {
  beforeEach(() => {
    const now = new Date().toISOString()
    const savedFile = {
      id: 'file-1',
      userId: '1',
      title: '个税申报表 2026-04-22',
      content: '个税报表工作流已生成标准申报表文件。',
      outputType: 'file' as const,
      fileFormat: 'xlsx' as const,
      fileName: '个税申报表.xlsx',
      filePath: '/tmp/个税申报表.xlsx',
      downloadUrl: '/api/news/saved/file-1/download',
      isPublished: false,
      publishedTo: [],
      createdAt: now,
      updatedAt: now,
    }

    useAppStore.setState({
      savedNews: [savedFile],
    })

    getSavedNews.mockResolvedValue([savedFile])
    deleteNews.mockResolvedValue({ success: true, message: 'ok' })
    getSavedWorkbook.mockResolvedValue({
      file: savedFile,
      sheetNames: ['申报表'],
      sheets: [
        {
          name: '申报表',
          rows: [
            ['姓名', '收入'],
            ['张三', '1000'],
          ],
        },
      ],
    })
    updateSavedWorkbook.mockResolvedValue({
      file: { ...savedFile, updatedAt: now },
      sheetNames: ['申报表'],
      sheets: [
        {
          name: '申报表',
          rows: [
            ['姓名', '收入'],
            ['张三', '2000'],
          ],
        },
      ],
    })
  })

  test('shows xlsx preview and edit entry points in task result cards', async () => {
    render(
      <MemoryRouter initialEntries={['/news']}>
        <Routes>
          <Route path="/news" element={<NewsList />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('link', { name: '预览文件' })).toHaveAttribute('href', '/news/file/file-1')
    expect(screen.getByRole('link', { name: '编辑文件' })).toHaveAttribute('href', '/news/file/file-1?mode=edit')
  })

  test('loads workbook page in edit mode and saves cell updates', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/news/file/file-1?mode=edit']}>
        <Routes>
          <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: '个税申报表 2026-04-22' })).toBeInTheDocument()
    expect(getSavedWorkbook).toHaveBeenCalledWith('file-1')

    const targetCell = screen.getByDisplayValue('1000')
    await user.clear(targetCell)
    await user.type(targetCell, '2000')
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    await waitFor(() => {
      expect(updateSavedWorkbook).toHaveBeenCalledWith('file-1', {
        sheetName: '申报表',
        rows: [
          ['姓名', '收入'],
          ['张三', '2000'],
        ],
      })
    })
  })

  test('shows review mode metadata and report directory summary', async () => {
    render(
      <MemoryRouter initialEntries={['/news/file/file-1?mode=edit']}>
        <Routes>
          <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('个税申报表')).toBeInTheDocument()
    expect(screen.getByText('审核模式：编辑中')).toBeInTheDocument()
    expect(screen.getByText('已保存')).toBeInTheDocument()
    expect(screen.getByText('报表目录')).toBeInTheDocument()
    expect(screen.getByText('当前文件含 1 个工作表，建议按模板顺序逐项核对。')).toBeInTheDocument()
    expect(screen.getByText('当前页')).toBeInTheDocument()
  })

  test('marks dirty state after editing and clears it after save', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/news/file/file-1?mode=edit']}>
        <Routes>
          <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
        </Routes>
      </MemoryRouter>
    )

    const targetCell = await screen.findByDisplayValue('1000')
    await user.clear(targetCell)
    await user.type(targetCell, '2000')

    expect(screen.getByText('已修改未保存')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存修改' }))

    await waitFor(() => {
      expect(screen.getByText('已保存')).toBeInTheDocument()
    })
  })

  test('renders financial table with dirty-cell review styling', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/news/file/file-1?mode=edit']}>
        <Routes>
          <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
        </Routes>
      </MemoryRouter>
    )

    const targetCell = await screen.findByDisplayValue('1000')
    await user.clear(targetCell)
    await user.type(targetCell, '2000')

    expect(targetCell).toHaveClass('text-right')
    expect(targetCell).toHaveAttribute('data-dirty', 'true')
  })

  test('disables save action in read-only mode', async () => {
    render(
      <MemoryRouter initialEntries={['/news/file/file-1']}>
        <Routes>
          <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('审核模式：只读预览')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存修改' })).toBeDisabled()
  })

  test('shows save success feedback and uses report-style metadata layout', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/news/file/file-1?mode=edit']}>
        <Routes>
          <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('审核模式：编辑中')).toBeInTheDocument()

    const targetCell = screen.getByDisplayValue('1000')
    await user.clear(targetCell)
    await user.type(targetCell, '2000')
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    expect(await screen.findByText('修改已保存')).toBeInTheDocument()
    expect(screen.getByText('保存状态').parentElement).toHaveAttribute('data-save-highlight', 'true')
  })
})
