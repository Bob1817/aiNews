import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Globe,
  Loader2,
  MessageSquare,
  Save,
  Share2,
} from 'lucide-react'
import { useToast } from '@/lib/toast'
import { useAppStore } from '@/store'
import type { SavedNews } from '@/types'
import { getErrorMessage } from '@/lib/errors'
import { createSavedNews, getSavedNews, updateSavedNews, publishNews } from '@/lib/api/news'
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
  const autoSaveTimerRef = useRef<number | null>(null)
  const lastPersistedSignatureRef = useRef('')
  const hasInitializedDraftRef = useRef(false)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categories: [] as string[],
    contentFormat: 'html' as const,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isLoadingNews, setIsLoadingNews] = useState(Boolean(id))
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [editorResetKey, setEditorResetKey] = useState(0)
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'typing' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaveFeedback, setLastSaveFeedback] = useState('自动保存将在首次手动保存后启用')

  const draftSignature = `${formData.title.trim()}::${formData.content.trim()}::${selectedPlatforms.slice().sort().join(',')}`

  const applyNewsToForm = (news: SavedNews) => {
    setFormData({
      title: news.title,
      content: convertContentToHtml(news.content, news.contentFormat),
      categories: news.categories || [],
      contentFormat: 'html',
    })
    setSelectedPlatforms(news.publishedTo || [])
    setEditorResetKey((current) => current + 1)
    lastPersistedSignatureRef.current = `${news.title.trim()}::${convertContentToHtml(news.content, news.contentFormat).trim()}::${(news.publishedTo || []).slice().sort().join(',')}`
    hasInitializedDraftRef.current = true
    setAutoSaveState('saved')
    setLastSaveFeedback(`上次保存于 ${new Date(news.updatedAt).toLocaleString('zh-CN')}`)
  }

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
  const lastSavedAt = currentNews?.updatedAt ? new Date(currentNews.updatedAt).toLocaleString('zh-CN') : '尚未保存'

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

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

  const persistDraft = async ({
    silent = false,
    navigateAfterCreate = false,
  }: {
    silent?: boolean
    navigateAfterCreate?: boolean
  }) => {
    if (!formData.title.trim() || !plainTextContent.trim()) return

    if (!silent) {
      setIsSaving(true)
    } else {
      setAutoSaveState('saving')
      setLastSaveFeedback('自动保存中...')
    }

    try {
      if (id) {
        const data = await updateSavedNews(id, formData)
        setSavedNews(savedNews.map((news) => (news.id === id ? data.data : news)))
        lastPersistedSignatureRef.current = draftSignature
        setAutoSaveState('saved')
        setLastSaveFeedback(`上次保存于 ${new Date(data.data.updatedAt).toLocaleString('zh-CN')}`)
      } else {
        const data = await createSavedNews({
          userId: '1',
          ...formData,
          industries: [],
        })
        setSavedNews([data.data as SavedNews, ...savedNews])
        lastPersistedSignatureRef.current = `${data.data.title.trim()}::${data.data.content.trim()}::${(data.data.publishedTo || []).slice().sort().join(',')}`
        hasInitializedDraftRef.current = true
        setAutoSaveState('saved')
        setLastSaveFeedback(`上次保存于 ${new Date(data.data.updatedAt).toLocaleString('zh-CN')}`)

        if (navigateAfterCreate) {
          navigate(`/news/edit/${data.data.id}`, { replace: true })
        }
      }

      if (!silent) {
        showToast({
          title: '保存成功',
          message: id ? '内容已更新。' : '任务结果已创建。',
          variant: 'success',
        })
      }
    } catch (error) {
      console.error('保存新闻失败:', error)
      if (!silent) {
        showToast({
          title: '保存失败',
          message: getErrorMessage(error, '请稍后重试'),
          variant: 'error',
        })
      }
      setAutoSaveState('error')
      setLastSaveFeedback(`保存失败：${getErrorMessage(error, '请稍后重试')}`)
    } finally {
      if (!silent) {
        setIsSaving(false)
      }
    }
  }

  const handleSave = async () => {
    await persistDraft({ silent: false, navigateAfterCreate: !id })
  }

  useEffect(() => {
    if (isLoadingNews || !hasInitializedDraftRef.current || !id) {
      return
    }

    if (!formData.title.trim() || !plainTextContent.trim()) {
      return
    }

    if (draftSignature === lastPersistedSignatureRef.current) {
      return
    }

    setAutoSaveState('typing')
    setLastSaveFeedback('检测到修改，等待自动保存...')

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      void persistDraft({ silent: true })
    }, 1500)

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [draftSignature, formData.title, formData.content, id, isLoadingNews, plainTextContent])

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

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    )
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

        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
          <div className="min-h-0 overflow-hidden pr-2">
            <Panel
              title="内容编辑"
              description="正文以富文本方式编辑，支持标题、段落、列表、引用和图片插入。"
            >
              <div className="flex h-full min-h-0 flex-col gap-5">
                <div className="sticky top-0 z-10 -mx-6 -mt-6 shrink-0 border-b border-slate-200 bg-white/96 px-6 pb-5 pt-6 backdrop-blur">
                  <label className="mb-2 block text-sm font-medium text-slate-700">标题</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((current) => ({ ...current, title: e.target.value }))}
                    placeholder="例如：本周行业观察与推送摘要"
                    className={`${inputClassName} text-base font-medium`}
                  />
                </div>

                <div className="min-h-0 flex-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">正文</label>
                  {isLoadingNews ? (
                    <div className="flex h-[min(72vh,900px)] items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 text-sm text-slate-500">
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
          </div>

          <div className="min-h-0 pr-2">
            <div className="sticky top-4">
              <Panel
                title="操作面板"
                description="先保存草稿，确认无误后再发布到外部渠道。"
              >
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_18px_34px_rgba(15,23,42,0.06)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">控制仓</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {currentNews?.isPublished ? '已发布稿件' : id ? '草稿编辑中' : '新建草稿'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          currentNews?.isPublished
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {currentNews?.isPublished ? '已发布' : '草稿'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">最近保存</span>
                        <span className="font-medium text-slate-900">{lastSavedAt}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">当前字数</span>
                        <span className="font-medium text-slate-900">{contentLength}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">发布渠道</span>
                        <span className="font-medium text-slate-900">
                          {currentNews?.publishedTo?.length ? `${currentNews.publishedTo.length} 个渠道` : '尚未发布'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 rounded-2xl px-3.5 py-3 text-sm font-medium ${
                      autoSaveState === 'error'
                        ? 'bg-rose-50 text-rose-700'
                        : autoSaveState === 'saved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {autoSaveState === 'saving' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : autoSaveState === 'saved' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {lastSaveFeedback}
                  </div>

                  {currentNews?.isPublished && (
                    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      当前内容已对外发布，修改后建议再次核验并同步。
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">查看</p>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      文章预览
                    </button>
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">草稿</p>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? '保存中...' : '保存草稿'}
                    </button>
                  </div>

                  {id ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">发布</p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => togglePlatform('website')}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                            selectedPlatforms.includes('website')
                              ? 'border-sky-300 bg-sky-50 text-sky-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Globe className="h-4 w-4" />
                          官网新闻
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePlatform('wechat')}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                            selectedPlatforms.includes('wechat')
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <MessageSquare className="h-4 w-4" />
                          微信公众号
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          if (selectedPlatforms.length > 0) {
                            void handlePublish(selectedPlatforms)
                          }
                        }}
                        disabled={isPublishing || selectedPlatforms.length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)] transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        <Share2 className="h-4 w-4" />
                        {isPublishing ? '发布中...' : selectedPlatforms.length === 0 ? '先选择渠道' : '发布到所选渠道'}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-500">
                      先保存草稿，随后即可选择渠道发布。
                    </div>
                  )}

                  {id && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                      已选择渠道：
                      <span className="ml-1 font-medium text-slate-700">
                        {selectedPlatforms.length > 0 ? selectedPlatforms.join('、') : '尚未选择'}
                      </span>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_36px_100px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-8 py-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                  Preview
                </p>
                <h3 className="mt-2 line-clamp-2 text-2xl font-semibold text-slate-900">
                  {formData.title.trim() || '尚未填写标题'}
                </h3>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
              >
                关闭
              </button>
            </div>

            <div className="overflow-y-auto px-8 py-6">
              <article className="rounded-[24px] border border-slate-100 bg-slate-50/60 p-6">
                {plainTextContent.trim() ? (
                  <ArticleContent content={formData.content} contentFormat={formData.contentFormat} />
                ) : (
                  <p className="text-sm leading-7 text-slate-500">
                    当前还没有可预览的正文内容。
                  </p>
                )}
              </article>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
