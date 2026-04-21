import { MarkdownRenderer } from './MarkdownRenderer'
import { convertContentToHtml, resolveContentFormat, type ContentFormat } from '@/lib/utils/contentFormat'

export function ArticleContent({
  content,
  contentFormat,
  className = '',
}: {
  content: string
  contentFormat?: ContentFormat
  className?: string
}) {
  const resolvedFormat = resolveContentFormat(content, contentFormat)

  if (resolvedFormat === 'markdown') {
    return (
      <div className={`article-content ${className}`}>
        <MarkdownRenderer content={content} />
      </div>
    )
  }

  if (resolvedFormat === 'plain') {
    return (
      <div
        className={`article-content ${className}`}
        dangerouslySetInnerHTML={{ __html: convertContentToHtml(content, 'plain') }}
      />
    )
  }

  return (
    <div
      className={`article-content ${className}`}
      dangerouslySetInnerHTML={{ __html: convertContentToHtml(content, 'html') }}
    />
  )
}
