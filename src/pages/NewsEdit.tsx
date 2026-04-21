import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Globe,
  MessageSquare,
  Save,
  Share2,
} from 'lucide-react'
import { useToast } from '@/lib/toast'
import { useAppStore } from '@/store'
import type { NewsCategory, SavedNews } from '@/types'
import { getErrorMessage } from '@/lib/errors'
import { getCategories } from '@/lib/api/categories'
import { createSavedNews, getSavedNews, updateSavedNews, publishNews } from '@/lib/api/news'
import { getDefaultCategories } from '@/lib/fallbacks'
import { uploadWorkspaceAsset } from '@/lib/api/config'
import { ArticleContent } from '@/components/ArticleContent'
import { RichTextEditor } from '@/components/RichTextEditor'
import { convertContentToHtml, getContentExcerpt } from '@/lib/utils/contentFormat'

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_55px_rgba(15,23,42,0.05)]">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <div className="group relative">
            <AlertCircle className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600" />
            <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-64 rounded-lg bg-slate-900 p-3 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              {description}
            </div>
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100'

export function NewsEdit() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { savedNews, setSavedNews } = useAppStore()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categories: [] as string[],
    contentFormat: 'html' as const,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPublishOptions, setShowPublishOptions] = useState(false)
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isLoadingNews, setIsLoadingNews] = useState(Boolean(id))
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [editorResetKey, setEditorResetKey] = useState(0)

  const applyNewsToForm = (news: SavedNews) => {
    setFormData({
      title: news.title,
      content: convertContentToHtml(news.content, news.contentFormat),
      categories: news.categories || [],
      contentFormat: 'html',
    })
    setSelectedPlatforms(news.publishedTo || [])
    setEditorResetKey((current) => current + 1)
  }

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const data = await getCategories()
        setCategories(data)
      } catch {
        setCategories(getDefaultCategories())
        showToast({
          title: '分类加载失败',
          message: '已切换为默认分类。',
          variant: 'info',
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [showToast])

  useEffect(() => {
    const loadNews = async () => {
      if (!id) {
        setIsLoadingNews(false)
        return
      }

      setIsLoadingNews(true)

      const existingNews = savedNews.find((item) => item.id === id)
      if (existingNews) {
        applyNewsToForm(existingNews)
        setIsLoadingNews(false)
        return
      }

      try {
        const allSavedNews = await getSavedNews('1')
        setSavedNews(allSavedNews)
        const matchedNews = allSavedNews.find((item) => item.id === id)
        if (matchedNews) {
          applyNewsToForm(matchedNews)
        } else {
          showToast({
            title: '内容不存在',
            message: '未找到对应的任务结果。',
            variant: 'error',
          })
        }
      } catch (error) {
        showToast({
          title: '加载失败',
          message: getErrorMessage(error, '请稍后重试'),
          variant: 'error',
        })
      } finally {
        setIsLoadingNews(false)
      }
    }

    loadNews()
  }, [id, savedNews, setSavedNews, showToast])

  const currentNews = id ? savedNews.find((item) => item.id === id) : null
  const plainTextContent = getContentExcerpt(formData.content, formData.contentFormat, Number.MAX_SAFE_INTEGER)
  const contentLength = plainTextContent.trim().length
  const estimatedReadMinutes = Math.max(1, Math.ceil(contentLength / 450))
  const selectedCategoryNames = useMemo(
    () =>
      formData.categories
        .map((categoryId) => categories.find((item) => item.id === categoryId)?.name)
        .filter(Boolean) as string[],
    [categories, formData.categories]
  )

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('读取文件失败'))
          return
        }

        const [, contentBase64 = ''] = result.split(',')
        resolve(contentBase64)
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsDataURL(file)
    })

  const handleUploadImage = async (file: File) => {
    const contentBase64 = await readFileAsBase64(file)
    const result = await uploadWorkspaceAsset({
      userId: '1',
      fileName: file.name,
      contentBase64,
      mimeType: file.type || 'application/octet-stream',
    })

    showToast({
      title: '图片已上传',
      message: `${file.name} 已插入正文。`,
      variant: 'success',
    })

    return result.data.assetUrl
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !plainTextContent.trim()) return

    setIsSaving(true)

    try {
      if (id) {
        const data = await updateSavedNews(id, formData)
        setSavedNews(savedNews.map((news) => (news.id === id ? data.data : news)))
      } else {
        const data = await createSavedNews({
          userId: '1',
          ...formData,
          industries: [],
        })
        setSavedNews([data.data as SavedNews, ...savedNews])
      }

      showToast({
        title: '保存成功',
        message: id ? '内容已更新。' : '任务结果已创建。',
        variant: 'success',
      })
      navigate('/news')
    } catch (error) {
      console.error('保存新闻失败:', error)
      showToast({
        title: '保存失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async (platforms: string[]) => {
    if (!id) return

    setIsPublishing(true)

    try {
      await publishNews(id, platforms)

      setSavedNews(
        savedNews.map((news) =>
          news.id === id
            ? {
                ...news,
                isPublished: true,
                publishedTo: [...new Set([...news.publishedTo, ...platforms])],
                updatedAt: new Date().toISOString(),
              }
            : news
        )
      )
      setShowPublishOptions(false)
      showToast({
        title: '发布成功',
        message: `已发布到 ${platforms.join('、')}`,
        variant: 'success',
      })
    } catch (error) {
      console.error('发布新闻失败:', error)
      showToast({
        title: '发布失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const toggleCategory = (categoryId: string, checked: boolean) => {
    setFormData((current) => ({
      ...current,
      categories: checked
        ? [...current.categories, categoryId]
        : current.categories.filter((item) => item !== categoryId),
    }))
  }

  return (
    <div className="h-full overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-6 overflow-hidden px-6 py-6 lg:px-10">
        <Link
          to="/news"
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          返回任务结果
        </Link>

        <section className="rounded-[32px] border border-slate-200 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
                Editor Workspace
              </p>
              <h1 className="mt-3 font-display text-3xl text-slate-900 md:text-4xl">
                {id ? '编辑任务结果' : '新建任务结果'}
              </h1>
            </div>

            <div className="grid justify-items-center gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <div className="w-36 rounded-[26px] border border-slate-200 bg-white px-4 py-4 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">状态</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {currentNews?.isPublished ? '已发布' : '草稿'}
                </p>
              </div>
              <div className="w-36 rounded-[26px] border border-slate-200 bg-white px-4 py-4 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">正文长度</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{contentLength}</p>
              </div>
              <div className="w-36 rounded-[26px] border border-slate-200 bg-white px-4 py-4 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">阅读时长</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{estimatedReadMinutes} 分钟</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_420px]">
          <div className="min-h-0 space-y-6 overflow-y-auto pr-2">
            <Panel
              title="内容编辑"
              description="正文以富文本方式编辑，支持标题、段落、列表、引用和图片插入。"
            >
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">标题</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((current) => ({ ...current, title: e.target.value }))}
                    placeholder="例如：本周行业观察与推送摘要"
                    className={`${inputClassName} text-base font-medium`}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">正文</label>
                  {isLoadingNews ? (
                    <div className="flex min-h-[520px] items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 text-sm text-slate-500">
                      正在加载正文内容...
                    </div>
                  ) : (
                    <RichTextEditor
                      key={id ? `${id}-${editorResetKey}` : 'new-news'}
                      value={formData.content}
                      placeholder="输入最终对外的内容稿，支持插入图片。"
                      onChange={(content) =>
                        setFormData((current) => ({
                          ...current,
                          content,
                          contentFormat: 'html',
                        }))
                      }
                      onUploadImage={handleUploadImage}
                    />
                  )}
                </div>
              </div>
            </Panel>

            <Panel
              title="分类归档"
              description="将结果归入合适的分类，后续检索、统计和回看会更轻松。"
            >
              {isLoadingCategories ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  加载分类中...
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {categories.map((category) => {
                    const active = formData.categories.includes(category.id)
                    return (
                      <label
                        key={category.id}
                        className={`cursor-pointer rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                          active
                            ? 'border-sky-300 bg-sky-50 text-sky-700 shadow-[0_12px_30px_rgba(14,165,233,0.12)]'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => toggleCategory(category.id, e.target.checked)}
                          className="sr-only"
                        />
                        {category.name}
                      </label>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>

          <div className="min-h-0 flex flex-col gap-6 pr-2">
            <div className="shrink-0">
              <Panel
                title="操作面板"
                description="先保存草稿，确认无误后再发布到外部渠道。"
              >
                <div className="space-y-3">
                  {currentNews?.isPublished && (
                    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      该内容已发布，可继续编辑后再次同步。
                    </div>
                  )}

                  {id && (
                    <button
                      onClick={() => setShowPublishOptions(true)}
                      disabled={isPublishing}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Share2 className="h-4 w-4" />
                      {isPublishing ? '发布中...' : '发布到渠道'}
                    </button>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? '保存中...' : '保存草稿'}
                  </button>
                </div>
              </Panel>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <Panel
                title="文章预览"
                description="按最终阅读形态渲染正文，编辑时可实时检查排版、图片和段落层次。"
              >
                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">标题预览</p>
                    <p className="mt-2 text-base font-medium text-slate-900">
                      {formData.title.trim() || '尚未填写标题'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">分类</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCategoryNames.length > 0 ? (
                        selectedCategoryNames.map((name) => (
                          <span
                            key={name}
                            className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                          >
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">尚未选择分类</span>
                      )}
                    </div>
                  </div>

                  <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                    <h3 className="font-display text-2xl text-slate-900">
                      {formData.title.trim() || '尚未填写标题'}
                    </h3>
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {plainTextContent.trim() ? (
                        <ArticleContent content={formData.content} contentFormat={formData.contentFormat} />
                      ) : (
                        <p className="text-sm leading-7 text-slate-500">
                          这里会显示文章最终预览，当前还没有正文内容。
                        </p>
                      )}
                    </div>
                  </article>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>

      {showPublishOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_36px_100px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
              Publish
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">选择发布渠道</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              可以先保存草稿，再选择将内容同步到官网新闻板块或微信公众号。
            </p>

            <div className="mt-6 space-y-3">
              <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100">
                  <Globe className="h-5 w-5 text-sky-700" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">官网新闻板块</p>
                  <p className="text-sm text-slate-500">适合正式发布的公开内容</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300 text-sky-600"
                  value="website"
                  checked={selectedPlatforms.includes('website')}
                  onChange={(e) => {
                    setSelectedPlatforms((current) =>
                      e.target.checked
                        ? [...new Set([...current, 'website'])]
                        : current.filter((platform) => platform !== 'website')
                    )
                  }}
                />
              </label>

              <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100">
                  <MessageSquare className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">微信公众号</p>
                  <p className="text-sm text-slate-500">适合推送给已有订阅用户</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600"
                  value="wechat"
                  checked={selectedPlatforms.includes('wechat')}
                  onChange={(e) => {
                    setSelectedPlatforms((current) =>
                      e.target.checked
                        ? [...new Set([...current, 'wechat'])]
                        : current.filter((platform) => platform !== 'wechat')
                    )
                  }}
                />
              </label>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                onClick={() => setShowPublishOptions(false)}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (selectedPlatforms.length > 0) {
                    handlePublish(selectedPlatforms)
                  }
                }}
                disabled={isPublishing}
                className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {isPublishing ? '发布中...' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
