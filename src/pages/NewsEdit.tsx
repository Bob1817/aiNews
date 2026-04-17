import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, Share2, CheckCircle2, Globe, MessageSquare } from 'lucide-react'
import { useToast } from '@/lib/toast'
import { useAppStore } from '@/store'
import type { SavedNews, NewsCategory } from '@/types'
import { getErrorMessage } from '@/lib/errors'
import { getCategories } from '@/lib/api/categories'
import { createSavedNews, publishNews, updateSavedNews } from '@/lib/api/news'
import { getDefaultCategories } from '@/lib/fallbacks'

export function NewsEdit() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { savedNews, setSavedNews } = useAppStore()

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categories: [] as string[],
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPublishOptions, setShowPublishOptions] = useState(false)
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    // 获取分类列表
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const data = await getCategories()
        setCategories(data)
      } catch (error) {
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

    if (id) {
      const news = savedNews.find((n) => n.id === id)
      if (news) {
        setFormData({
          title: news.title,
          content: news.content,
          categories: news.categories || [],
        })
        setSelectedPlatforms(news.publishedTo || [])
      }
    }
  }, [id, savedNews, showToast])

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return

    setIsSaving(true)

    try {
      if (id) {
        const data = await updateSavedNews(id, formData)

        setSavedNews(
          savedNews.map((news) => (news.id === id ? data.data : news))
        )
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
        message: id ? '新闻内容已更新。' : '新闻已创建。',
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

  const currentNews = id ? savedNews.find((n) => n.id === id) : null

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            to="/news"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">
              {id ? '编辑新闻' : '新建新闻'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {id && currentNews && (
              <div className="flex items-center gap-2">
                {currentNews.isPublished && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    已发布
                  </span>
                )}
              </div>
            )}
            {id && (
              <button
                onClick={() => setShowPublishOptions(true)}
                disabled={isPublishing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Share2 className="w-4 h-4" />
                {isPublishing ? '发布中...' : '发布'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新闻标题
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入新闻标题..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新闻分类
            </label>
            {isLoadingCategories ? (
              <div className="text-center py-4">加载分类中...</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      formData.categories.includes(category.id)
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            categories: [...formData.categories, category.id],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            categories: formData.categories.filter((id) => id !== category.id),
                          })
                        }
                      }}
                      className="sr-only"
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新闻内容
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="请输入新闻内容..."
              rows={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {showPublishOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">选择发布平台</h3>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">官网新闻板块</p>
                  <p className="text-sm text-gray-500">发布到公司官网</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 rounded"
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

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">微信公众号</p>
                  <p className="text-sm text-gray-500">推送到微信公众号</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 text-green-600 rounded"
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

            <div className="flex gap-3">
              <button
                onClick={() => setShowPublishOptions(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
