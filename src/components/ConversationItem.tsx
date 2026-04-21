import { useEffect, useRef, useState } from 'react'
import { User, Bot, Quote, Save, Copy, Repeat, MoreHorizontal, Clock3, X } from 'lucide-react'
import type { ConversationMessage, NewsArticle } from '@/types'
import { useToast } from '@/lib/toast'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ConversationItemProps {
  message: ConversationMessage
  referencedNews?: NewsArticle | null
  onSaveContent?: (content: string) => void
  onForwardToInput?: (content: string) => void
  onMarkdownAction?: (action: string) => void
  isSaving?: boolean
  queueStatus?: 'queued'
  onRemoveQueued?: () => void
}

export function ConversationItem({
  message,
  referencedNews,
  onSaveContent,
  onForwardToInput,
  onMarkdownAction,
  isSaving,
  queueStatus,
  onRemoveQueued,
}: ConversationItemProps) {
  const isUser = message.role === 'user'
  const { showToast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setMenuOpen(false)
      showToast({
        title: '复制成功',
        variant: 'success',
      })
    } catch (error) {
      console.error('复制失败:', error)
      showToast({
        title: '复制失败',
        message: '请稍后重试',
        variant: 'error',
      })
    }
  }

  const removeMarkdown = (text: string) => {
    return text
      .replace(/^#+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^>+/gm, '')
      .replace(/^---+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const messageTime = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const actionButtonClassName = isUser
    ? 'focus-ring group relative rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900'
    : 'focus-ring group relative rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900'

  const actionColumn = (
    <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((current) => !current)}
            className={actionButtonClassName}
            title="更多操作"
            aria-label="更多操作"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-[calc(100%+8px)] z-20 min-w-[148px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
              <button
                onClick={() => handleCopy(message.content)}
                className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Copy className="h-4 w-4 text-slate-500" />
                复制
              </button>
              {onForwardToInput && (
                <button
                  onClick={() => {
                    onForwardToInput(message.content)
                    setMenuOpen(false)
                  }}
                  className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Repeat className="h-4 w-4 text-slate-500" />
                  转发
                </button>
              )}
              {!isUser && onSaveContent && (
                <button
                  onClick={() => {
                    onSaveContent(message.content)
                    setMenuOpen(false)
                  }}
                  disabled={isSaving}
                  className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? '保存中...' : '保存内容'}
                </button>
              )}
              {queueStatus === 'queued' && onRemoveQueued && (
                <button
                  onClick={() => {
                    onRemoveQueued()
                    setMenuOpen(false)
                  }}
                  className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-700 transition-colors hover:bg-rose-50"
                >
                  <X className="h-4 w-4" />
                  取消排队
                </button>
              )}
            </div>
          )}
        </div>
      </div>
  )

  return (
    <div className="mb-5">
      {isUser ? (
        <div className="flex w-full flex-col items-end">
          <div className="mb-1 flex w-full items-center justify-end gap-2 pr-1">
            <p className="text-xs text-editorial-muted">{messageTime}</p>
            {message.workflowInvocation && (
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {message.workflowInvocation}
              </div>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
              <User className="h-4.5 w-4.5 text-slate-700" />
            </div>
          </div>
          <div className="flex w-full justify-end">
            <div className="w-full max-w-[85%]">
            
            {referencedNews && (
              <div className="mb-3 flex justify-end">
                <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">引用新闻</p>
                    <p className="text-sm text-slate-700">{referencedNews.title}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-end justify-end gap-3">
              {actionColumn}
              <div className={`rounded-[22px] rounded-tr-md border px-4 py-3.5 shadow-[0_12px_26px_rgba(37,99,235,0.14)] ${
                queueStatus === 'queued'
                  ? 'border-amber-200 bg-amber-50 text-amber-950 shadow-[0_12px_26px_rgba(245,158,11,0.08)]'
                  : 'border-blue-200 bg-blue-600 text-white'
              }`}>
                {queueStatus === 'queued' && (
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white/70 px-2.5 py-1 text-xs font-medium text-amber-700">
                    <Clock3 className="h-3.5 w-3.5" />
                    排队中
                  </div>
                )}
                <p className="whitespace-pre-wrap text-[15px] leading-7">{removeMarkdown(message.content)}</p>
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col items-start">
          <div className="mb-1 flex w-full items-center justify-start gap-2 pl-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              <Bot className="h-4.5 w-4.5 text-white" />
            </div>
            {message.workflowInvocation && (
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {message.workflowInvocation}
              </div>
            )}
            <p className="text-xs text-editorial-muted">{messageTime}</p>
          </div>
          <div className="flex w-full justify-start">
            <div className="w-full max-w-[85%]">
            
            {referencedNews && (
              <div className="mb-3 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">引用新闻</p>
                  <p className="text-sm text-slate-700">{referencedNews.title}</p>
                </div>
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="rounded-[22px] rounded-tl-md border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
                <MarkdownRenderer
                  content={message.content}
                  className="text-[15px] leading-7 text-slate-800"
                  onCommandClick={onForwardToInput}
                  onActionClick={onMarkdownAction}
                />
              </div>
              {actionColumn}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
