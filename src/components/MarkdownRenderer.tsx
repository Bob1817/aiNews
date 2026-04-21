import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
  maxLines?: number
  showFullContent?: boolean
  onCommandClick?: (command: string) => void
  onActionClick?: (action: string) => void
}

export function MarkdownRenderer({
  content,
  className = '',
  maxLines,
  showFullContent = false,
  onCommandClick,
  onActionClick,
}: MarkdownRendererProps) {
  let displayContent = content || ''
  if (maxLines && !showFullContent) {
    const lines = displayContent.split('\n')
    if (lines.length > maxLines) {
      displayContent = lines.slice(0, maxLines).join('\n') + '...'
    }
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => {
          if (url.startsWith('command:') || url.startsWith('action:')) {
            return url
          }

          return url
        }}
        components={{
          h1: ({ ...props }) => (
            <h1 className="mb-3 mt-5 text-xl font-semibold text-slate-900" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="mb-3 mt-5 text-lg font-semibold text-slate-900" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="mb-2 mt-3 text-sm font-semibold text-slate-900" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="my-2.5 leading-7 text-slate-700" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="my-3 ml-5 list-disc space-y-1.5 text-slate-700" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="my-3 ml-5 list-decimal space-y-1.5 text-slate-700" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="my-1" {...props} />
          ),
          a: ({ href, children, ...props }) => {
            if (href?.startsWith('command:')) {
              const command = decodeURIComponent(href.replace(/^command:/, ''))

              return (
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700 transition-colors hover:bg-blue-100"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onCommandClick?.(command)
                  }}
                >
                  {children}
                </button>
              )
            }

            if (href?.startsWith('action:')) {
              const action = href.replace(/^action:/, '')

              return (
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onActionClick?.(action)
                  }}
                >
                  {children}
                </button>
              )
            }

            return (
              <a
                className="text-blue-600 underline underline-offset-2 transition-colors hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
                href={href}
                {...props}
              >
                {children}
              </a>
            )
          },
          code: ({ className, children, ...props }) => {
            const codeClassName = className || ''
            const isInline = !codeClassName.includes('language-') && !codeClassName.includes('hljs')
            if (isInline) {
              return (
                <code
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.92em] text-slate-800"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-100">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            )
          },
          blockquote: ({ ...props }) => (
            <blockquote
              className="my-4 rounded-r-2xl border-l-2 border-blue-300 bg-slate-50 py-2 pl-4 text-slate-600"
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-slate-200" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-slate-50" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="border border-slate-200 px-4 py-2 text-left font-semibold text-slate-700" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="border border-slate-200 px-4 py-2 text-slate-700" {...props} />
          ),
          hr: ({ ...props }) => (
            <hr className="my-5 border-slate-200" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-semibold text-slate-900" {...props} />
          ),
          em: ({ ...props }) => (
            <em className="italic" {...props} />
          ),
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  )
}
