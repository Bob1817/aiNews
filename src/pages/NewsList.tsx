import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit, Share2, Calendar, CheckCircle2, Search, Filter } from 'lucide-react'
import { useAppStore } from '@/store'
import type { SavedNews, NewsCategory } from '@/types'
import { getCategories } from '@/lib/api/categories'
import { getSavedNews } from '@/lib/api/news'
import { getDefaultCategories, getMockSavedNews } from '@/lib/fallbacks'

export function NewsList() {
  const { savedNews, setSavedNews } = useAppStore()
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [industryFilter, setIndustryFilter] = useState('all')
  const industries = ['科技', '医疗', '汽车', '新能源', '云计算']
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [, setIsLoadingCategories] = useState(false)

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
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
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

                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {news.title}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {news.content}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(news.updatedAt).toLocaleDateString('zh-CN')}
                  </div>
                  {news.publishedTo.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      {news.publishedTo.length} 平台
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/news/edit/${news.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
