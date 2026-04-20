import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit, Share2, Calendar, CheckCircle2, Search, Filter, Trash2, Eye, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAppStore } from '@/store'
import type { SavedNews, NewsCategory } from '@/types'
import { getCategories } from '@/lib/api/categories'
import { getSavedNews, deleteNews } from '@/lib/api/news'
import { getDefaultCategories, getMockSavedNews } from '@/lib/fallbacks'

export function NewsList() {
  const { savedNews, setSavedNews } = useAppStore()
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [industryFilter, setIndustryFilter] = useState('all')
  const industries = ['科技', '医疗', '汽车', '新能源', '云计算']
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [, setIsLoadingCategories] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [previewNews, setPreviewNews] = useState<SavedNews | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    // 从后端 API 获取保存的新闻
    const fetchSavedNews = async () => {
      try {
        const news = await getSavedNews('1')
        setSavedNews(news)
      } catch (error) {
        setSavedNews(getMockSavedNews())
      }
    }

    // 从后端 API 获取分类列表
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const data = await getCategories()
        setCategories(data)
      } catch (error) {
        setCategories(getDefaultCategories())
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchSavedNews()
    fetchCategories()
  }, [setSavedNews])

  const filteredNews = (savedNews as (SavedNews & { industries?: string[] })[]).filter((news) => {
    // 状态过滤
    if (filter === 'published' && !news.isPublished) return false
    if (filter === 'draft' && news.isPublished) return false
    
    // 关键词搜索
    if (searchKeyword && !news.title.includes(searchKeyword) && !news.content.includes(searchKeyword)) {
      return false
    }
    
    // 行业筛选
    if (industryFilter !== 'all') {
      return news.industries?.includes(industryFilter) || false
    }
    
    return true
  })

  // 处理删除确认
  const handleDeleteConfirm = (id: string) => {
    setDeleteId(id)
    setShowDeleteConfirm(true)
  }

  // 处理删除
  const handleDelete = async () => {
    if (!deleteId) return
    
    try {
      setIsDeleting(true)
      await deleteNews(deleteId)
      // 从状态中移除删除的新闻
      setSavedNews(savedNews.filter(news => news.id !== deleteId))
    } catch (error) {
      console.error('删除新闻失败:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setDeleteId(null)
    }
  }

  // 取消删除
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteId(null)
  }

  // 处理预览
  const handlePreview = (news: SavedNews) => {
    setPreviewNews(news)
    setShowPreview(true)
  }

  // 关闭预览
  const handleClosePreview = () => {
    setShowPreview(false)
    setPreviewNews(null)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">新闻管理</h1>
            <p className="text-gray-500 mt-1">管理您保存和创作的所有新闻</p>
          </div>
          <Link
            to="/news/edit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建新闻
          </Link>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索新闻标题或内容..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative w-full md:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全行业</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-4">
          {(['all', 'published', 'draft'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'all' && '全部'}
              {f === 'published' && '已发布'}
              {f === 'draft' && '草稿'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无新闻</h3>
            <p className="text-gray-500 mb-4">开始创建您的第一篇新闻吧</p>
            <Link
              to="/news/edit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建新闻
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNews.map((news) => (
              <div
                key={news.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col min-h-[320px]"
              >
                <div className="flex-1 flex flex-col">
                  <div className="flex flex-wrap items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    {news.isPublished ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        已发布
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        草稿
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(news)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="预览"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {news.url && (
                      <a
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="打开原始链接"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {news.industries && news.industries.map((industry) => (
                        <span key={industry} className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {industry}
                        </span>
                      ))}
                      {news.categories && news.categories.map((categoryId) => {
                        const category = categories.find(cat => cat.id === categoryId)
                        return category ? (
                          <span key={categoryId} className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                            {category.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>

                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {news.title}
                  </h3>

                  <p className="text-sm text-gray-600 line-clamp-3 flex-1 mb-4">
                    {news.content}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(news.updatedAt).toLocaleDateString('zh-CN')}
                    </div>
                    {news.publishedTo && news.publishedTo.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Share2 className="w-3 h-3" />
                        {news.publishedTo.length} 平台
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Link
                    to={`/news/edit/${news.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </Link>
                  <button
                    onClick={() => handleDeleteConfirm(news.id)}
                    disabled={isDeleting}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">
              确定要删除这篇新闻吗？此操作不可撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isDeleting && (
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isDeleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      {showPreview && previewNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl p-8 max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">新闻预览</h3>
              <div className="flex gap-1">
                <Link
                  to={`/news/edit/${previewNews.id}`}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="编辑"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </Link>
                <button
                  onClick={() => handleDeleteConfirm(previewNews.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="删除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
                <button
                  onClick={handleClosePreview}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="关闭"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="border-b border-gray-200 pb-1 mb-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{previewNews.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500 my-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(previewNews.updatedAt).toLocaleDateString('zh-CN')}
                </div>
                {previewNews.isPublished && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    已发布
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 my-2">
                {previewNews.industries && previewNews.industries.map((industry) => (
                  <span key={industry} className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {industry}
                  </span>
                ))}
                {previewNews.categories && previewNews.categories.map((categoryId) => {
                  const category = categories.find(cat => cat.id === categoryId)
                  return category ? (
                    <span key={categoryId} className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      {category.name}
                    </span>
                  ) : null
                })}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="prose max-w-none py-6 pb-12 bg-gray-50 rounded-lg mb-6 space-y-6">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 indent-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold mb-3 indent-0">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-bold mb-2 indent-0">{children}</h3>,
                    p: ({ children }) => <p className="leading-relaxed indent-8">{children}</p>,
                    ul: ({ children }) => <ul className="space-y-2">{children}</ul>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  }}
                >
                  {previewNews.content}
                </ReactMarkdown>
              </div>
              

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
