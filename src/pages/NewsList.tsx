import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileCode,
  FileJson,
  FileText,
  Filter,
  MessageSquare,
  Search,
  Share2,
  Trash2,
  Workflow,
} from 'lucide-react'
import { useAppStore } from '@/store'
import type { NewsCategory, SavedNews } from '@/types'
import { getCategories } from '@/lib/api/categories'
import { deleteNews, downloadSavedFile, getSavedNews } from '@/lib/api/news'
import { getDefaultCategories, getMockSavedNews } from '@/lib/fallbacks'
import { ArticleContent } from '@/components/ArticleContent'
import {
  convertContentToHtml,
  extractFirstImageUrl,
  getContentExcerpt,
  NEWS_PLACEHOLDER_IMAGE,
} from '@/lib/utils/contentFormat'

type SavedNewsWithIndustries = SavedNews & { industries?: string[] }

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex min-h-[112px] flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-center shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  )
}

export function NewsList() {
  const { savedNews, setSavedNews } = useAppStore()
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'news' | 'file'>('all')
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [, setIsLoadingCategories] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [previewNews, setPreviewNews] = useState<SavedNews | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState<string | null>(null)

  const getFileTypeIcon = (content: string) => {
    try {
      JSON.parse(content)
      return { icon: FileJson, color: 'text-fuchsia-500', label: 'JSON' }
    } catch {
      if (
        content.includes('<p') ||
        content.includes('<h1') ||
        content.includes('<img') ||
        content.includes('<div')
      ) {
        return { icon: FileCode, color: 'text-amber-500', label: 'HTML' }
      }
      if (
        content.includes('```') ||
        content.includes('function ') ||
        content.includes('import ') ||
        content.includes('export ')
      ) {
        return { icon: FileCode, color: 'text-sky-500', label: '代码' }
      }
      if (
        content.includes('# ') ||
        content.includes('## ') ||
        content.includes('### ') ||
        content.includes('**') ||
        content.includes('* ')
      ) {
        return { icon: FileText, color: 'text-emerald-500', label: 'Markdown' }
      }
      return { icon: FileText, color: 'text-slate-400', label: '文本' }
    }
  }

  const getTaskType = (news: SavedNews) => {
    if (news.outputType === 'file') {
      return { icon: FileText, label: '文件' }
    }
    if (news.outputType === 'news') {
      return { icon: MessageSquare, label: '新闻' }
    }
    if (news.content.includes('工作流') || news.content.includes('workflow')) {
      return { icon: Workflow, label: '工作流结果' }
    }
    if (news.content.includes('AI 助手') || news.content.includes('AI assistant')) {
      return { icon: MessageSquare, label: 'AI 对话' }
    }
    return { icon: FileText, label: '任务结果' }
  }

  const downloadFile = (news: SavedNews, format: 'md' | 'txt' | 'json' | 'html') => {
    let content: string
    let mimeType: string
    let extension: string

    switch (format) {
      case 'md':
        content = `# ${news.title}\n\n${getContentExcerpt(news.content, news.contentFormat, Number.MAX_SAFE_INTEGER)}`
        mimeType = 'text/markdown'
        extension = 'md'
        break
      case 'txt':
        content = `${news.title}\n\n${getContentExcerpt(news.content, news.contentFormat, Number.MAX_SAFE_INTEGER)}`
        mimeType = 'text/plain'
        extension = 'txt'
        break
      case 'json':
        content = JSON.stringify(
          {
            title: news.title,
            content: getContentExcerpt(news.content, news.contentFormat, Number.MAX_SAFE_INTEGER),
            createdAt: news.createdAt,
            updatedAt: news.updatedAt,
            isPublished: news.isPublished,
            industries: news.industries,
            categories: news.categories,
          },
          null,
          2
        )
        mimeType = 'application/json'
        extension = 'json'
        break
      case 'html':
        const htmlBody =
          news.contentFormat === 'html'
            ? news.content
            : convertContentToHtml(news.content, news.contentFormat)

        content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${news.title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; color: #0f172a; }
    h1 { color: #0f172a; }
    .content { margin-top: 20px; }
    .meta { color: #64748b; font-size: 0.9em; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>${news.title}</h1>
  <div class="content">${htmlBody}</div>
  <div class="meta">
    <p>更新时间: ${new Date(news.updatedAt).toLocaleString('zh-CN')}</p>
    ${news.isPublished ? '<p>状态: 已发布</p>' : '<p>状态: 草稿</p>'}
  </div>
</body>
</html>`
        mimeType = 'text/html'
        extension = 'html'
        break
      default:
        content = news.content
        mimeType = 'text/plain'
        extension = 'txt'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${news.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloadMenuOpen(null)
  }

  useEffect(() => {
    const fetchSavedNews = async () => {
      try {
        const news = await getSavedNews('1')
        setSavedNews(news)
      } catch {
        setSavedNews(getMockSavedNews())
      }
    }

    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const data = await getCategories()
        setCategories(data)
      } catch {
        setCategories(getDefaultCategories())
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchSavedNews()
    fetchCategories()
  }, [setSavedNews])

  const filteredNews = useMemo(() => {
    return (savedNews as SavedNewsWithIndustries[])
      .filter((news) => {
        if (filter === 'published' && !news.isPublished) return false
        if (filter === 'draft' && news.isPublished) return false

        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase()
          const titleMatch = news.title.toLowerCase().includes(keyword)
          const contentMatch = news.content.toLowerCase().includes(keyword)
          if (!titleMatch && !contentMatch) return false
        }

        const outputType = news.outputType || 'news'
        if (typeFilter !== 'all' && outputType !== typeFilter) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        let comparison = 0

        if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
          comparison = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime()
        } else {
          comparison = a.title.localeCompare(b.title, 'zh-CN')
        }

        return sortOrder === 'asc' ? comparison : -comparison
      })
  }, [filter, typeFilter, savedNews, searchKeyword, sortBy, sortOrder])

  const publishedCount = savedNews.filter((item) => item.isPublished).length
  const draftCount = savedNews.length - publishedCount
  const fileCount = savedNews.filter((item) => item.outputType === 'file').length

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      setIsDeleting(true)
      await deleteNews(deleteId)
      setSavedNews(savedNews.filter((news) => news.id !== deleteId))
    } catch (error) {
      console.error('删除新闻失败:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-6 px-6 py-6 lg:px-10">
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-2xl self-center">
              <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">任务结果</h1>
              <p className="mt-2 text-sm text-slate-600">
                查看、筛选和继续处理任务产出。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <SummaryCard label="结果总数" value={String(savedNews.length)} />
              <SummaryCard label="已发布" value={String(publishedCount)} />
              <SummaryCard label="文件数量" value={String(fileCount)} />
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_220px_220px]">
            <label className="relative">
              <span className="sr-only">搜索任务结果</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索标题、正文或工作流输出内容"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <label className="relative">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'news' | 'file')}
                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              >
                <option value="all">全部类型</option>
                <option value="news">新闻</option>
                <option value="file">文件</option>
              </select>
            </label>

            <label className="relative">
              <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-')
                  setSortBy(newSortBy as 'updatedAt' | 'createdAt' | 'title')
                  setSortOrder(newSortOrder as 'asc' | 'desc')
                }}
                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              >
                <option value="updatedAt-desc">最新更新</option>
                <option value="updatedAt-asc">最早更新</option>
                <option value="createdAt-desc">最新创建</option>
                <option value="createdAt-asc">最早创建</option>
                <option value="title-asc">标题升序</option>
                <option value="title-desc">标题降序</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <FilterChip active={filter === 'all'} label={`全部 ${savedNews.length}`} onClick={() => setFilter('all')} />
            <FilterChip active={filter === 'published'} label={`已发布 ${publishedCount}`} onClick={() => setFilter('published')} />
            <FilterChip active={filter === 'draft'} label={`草稿 ${draftCount}`} onClick={() => setFilter('draft')} />
            <div className="ml-auto text-sm text-slate-500">
              当前结果 <span className="font-semibold text-slate-900">{filteredNews.length}</span> 条
            </div>
          </div>
        </section>

        {filteredNews.length === 0 ? (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-white/80 px-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.04)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-slate-100">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-slate-900">暂时没有匹配的结果</h2>
            <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
              你可以调整筛选条件，或者回到聊天工作台触发新的工作流。新的任务结果会自动沉淀到这里继续处理。
            </p>
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
            {filteredNews.map((news) => {
              const taskType = getTaskType(news)
              const TaskIcon = taskType.icon
              const fileType = getFileTypeIcon(news.content)
              const FileIcon = fileType.icon
              const coverImage =
                news.outputType === 'news'
                  ? extractFirstImageUrl(news.content, news.contentFormat) || NEWS_PLACEHOLDER_IMAGE
                  : NEWS_PLACEHOLDER_IMAGE

              return (
                <article
                  key={news.id}
                  className="group flex min-h-[440px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_50px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(15,23,42,0.09)]"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                    <img
                      src={coverImage}
                      alt={news.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {news.isPublished ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          已发布
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          草稿
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        <TaskIcon className="h-3.5 w-3.5" />
                        {taskType.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setPreviewNews(news)
                          setShowPreview(true)
                        }}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        title="预览"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {news.url && (
                        <a
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                          title="打开原始链接"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                      <FileIcon className={`h-6 w-6 ${fileType.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-lg font-semibold text-slate-900">
                        {news.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">{fileType.label} 内容</p>
                    </div>
                  </div>

                  <p className="mt-5 line-clamp-5 text-sm leading-7 text-slate-600">
                    {getContentExcerpt(news.content, news.contentFormat, 220)}
                  </p>

                  <div className="mt-5 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {new Date(news.updatedAt).toLocaleDateString('zh-CN')}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      {getContentExcerpt(news.content, news.contentFormat, Number.MAX_SAFE_INTEGER).length} 字符
                    </div>
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-slate-400" />
                      {news.publishedTo?.length ? `${news.publishedTo.length} 平台` : '未发布'}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {news.outputType === 'file' && news.fileFormat ? (
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        {news.fileFormat.toUpperCase()}
                      </span>
                    ) : null}
                    {news.industries?.map((industry) => (
                      <span key={industry} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        {industry}
                      </span>
                    ))}
                    {news.categories?.map((categoryId) => {
                      const category = categories.find((item) => item.id === categoryId)
                      return category ? (
                        <span
                          key={categoryId}
                          className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                        >
                          {category.name}
                        </span>
                      ) : null
                    })}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                    <Link
                      to={`/news/edit/${news.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      <Edit className="h-4 w-4" />
                      编辑内容
                    </Link>

                    <div className="relative">
                      {news.outputType === 'file' ? (
                        <button
                          onClick={() => downloadSavedFile(news)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                        >
                          <Download className="h-4 w-4" />
                          下载文件
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              setDownloadMenuOpen(downloadMenuOpen === news.id ? null : news.id)
                            }
                            className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                          >
                            <Download className="h-4 w-4" />
                            下载
                          </button>

                          {downloadMenuOpen === news.id && (
                            <div className="absolute left-0 top-full z-10 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                              {[
                                { key: 'md', label: 'Markdown (.md)', icon: FileText, color: 'text-emerald-500' },
                                { key: 'txt', label: '文本文件 (.txt)', icon: FileText, color: 'text-slate-400' },
                                { key: 'json', label: 'JSON (.json)', icon: FileJson, color: 'text-fuchsia-500' },
                                { key: 'html', label: 'HTML (.html)', icon: FileCode, color: 'text-sky-500' },
                              ].map((item) => (
                                <button
                                  key={item.key}
                                  onClick={() => downloadFile(news, item.key as 'md' | 'txt' | 'json' | 'html')}
                                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                >
                                  <item.icon className={`h-4 w-4 ${item.color}`} />
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setDeleteId(news.id)
                        setShowDeleteConfirm(true)
                      }}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
            <h3 className="text-xl font-semibold text-slate-900">确认删除这条结果？</h3>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              删除后将无法在任务结果列表中继续编辑或下载该内容。建议仅在确认不再需要时执行。
            </p>
            <div className="mt-7 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteId(null)
                }}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && previewNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_36px_100px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-8 py-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                  Preview
                </p>
                <h3 className="mt-2 line-clamp-2 text-2xl font-semibold text-slate-900">
                  {previewNews.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewNews.categories?.map((categoryId) => {
                    const category = categories.find((item) => item.id === categoryId)
                    return category ? (
                      <span
                        key={categoryId}
                        className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                      >
                        {category.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false)
                  setPreviewNews(null)
                }}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
              >
                关闭
              </button>
            </div>

            <div className="overflow-y-auto px-8 py-6">
              <div className="mb-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 sm:grid-cols-3">
                <div>更新时间：{new Date(previewNews.updatedAt).toLocaleString('zh-CN')}</div>
                <div>状态：{previewNews.isPublished ? '已发布' : '草稿'}</div>
                <div>字数：{getContentExcerpt(previewNews.content, previewNews.contentFormat, Number.MAX_SAFE_INTEGER).length}</div>
              </div>

              <article className="rounded-[24px] border border-slate-100 bg-slate-50/60 p-6">
                <ArticleContent content={previewNews.content} contentFormat={previewNews.contentFormat} />
              </article>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
