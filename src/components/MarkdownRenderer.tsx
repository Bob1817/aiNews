import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
  maxLines?: number
  showFullContent?: boolean
}

export function MarkdownRenderer({
  content,
  className = '',
  maxLines,
  showFullContent = false
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
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-700" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="text-base font-semibold mt-3 mb-2 text-gray-700" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="my-3 leading-relaxed text-gray-700" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="my-3 ml-5 list-disc space-y-1 text-gray-700" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="my-3 ml-5 list-decimal space-y-1 text-gray-700" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="my-1" {...props} />
          ),
          a: ({ ...props }) => (
            <a
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const codeClassName = className || ''
            const isInline = !codeClassName.includes('language-') && !codeClassName.includes('hljs')
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            )
          },
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-blue-300 pl-4 py-2 my-4 bg-blue-50 text-gray-700 italic"
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-gray-100" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="border border-gray-300 px-4 py-2 text-gray-700" {...props} />
          ),
          hr: ({ ...props }) => (
            <hr className="my-6 border-gray-300" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-semibold text-gray-900" {...props} />
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