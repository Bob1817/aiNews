import { Clock, ExternalLink, Quote } from 'lucide-react'
import type { NewsArticle } from '@/types'

interface NewsCardProps {
  article: NewsArticle
  onQuote?: (article: NewsArticle) => void
  isSelected?: boolean
}

export function NewsCard({ article, onQuote, isSelected }: NewsCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all cursor-pointer ${
      isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded">
          {article.source}
        </span>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="w-3 h-3" />
          {formatDate(article.publishedAt)}
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {article.title}
      </h3>

      <p className="text-sm text-gray-600 line-clamp-3 mb-4">
        {article.content}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {article.relatedKeywords.slice(0, 2).map((keyword) => (
            <span
              key={keyword}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
            >
              {keyword}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          {onQuote && (
            <button
              onClick={() => onQuote(article)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="引用此新闻"
            >
              <Quote className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
