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
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  return (
    <article className={`gradient-mesh group relative overflow-hidden rounded-[22px] border p-5 transition-all duration-200 ${
      isSelected
        ? 'border-editorial-cyan/45 bg-editorial-cyan/10 shadow-[0_20px_50px_rgba(8,145,178,0.18)]'
        : 'border-editorial-line bg-white/[0.03] hover:border-editorial-violet/35 hover:bg-white/[0.05] hover:shadow-[0_22px_55px_rgba(15,23,42,0.4)]'
    }`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
          {article.source}
        </span>
        <div className="flex items-center gap-1 text-xs text-editorial-muted">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(article.publishedAt)}
        </div>
      </div>

      <h3 className="mb-3 line-clamp-2 text-xl font-semibold leading-tight text-white transition-colors duration-200 group-hover:text-cyan-100">
        {article.title}
      </h3>

      <p className="mb-5 line-clamp-4 text-sm leading-6 text-slate-300">
        {article.content}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {article.relatedKeywords.slice(0, 2).map((keyword, index) => (
            <span
              key={`${article.id}-${index}-${keyword}`}
              className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
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
            className="focus-ring rounded-xl p-2 text-slate-400 transition-colors duration-200 hover:bg-white/8 hover:text-white"
            aria-label="打开原始链接"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          {onQuote && (
            <button
              onClick={() => onQuote(article)}
              className="focus-ring rounded-xl p-2 text-slate-400 transition-colors duration-200 hover:bg-editorial-violet/15 hover:text-cyan-200"
              title="引用此新闻"
              aria-label="引用此新闻"
            >
              <Quote className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
