import { useEffect, useRef, useState } from 'react'
import { User, Bot, Quote, Save, Copy, Repeat, MoreHorizontal } from 'lucide-react'
import type { ConversationMessage, NewsArticle } from '@/types'
import { useToast } from '@/lib/toast'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ConversationItemProps {
  message: ConversationMessage
  referencedNews?: NewsArticle | null
  onSaveToDraft?: (content: string) => void
  onForwardToInput?: (content: string) => void
  isSaving?: boolean
}

export function ConversationItem({ message, referencedNews, onSaveToDraft, onForwardToInput, isSaving }: ConversationItemProps) {
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
    : 'focus-ring group relative rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900'

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
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[148px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
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
            {!isUser && onSaveToDraft && (
              <button
                onClick={() => {
                  onSaveToDraft(message.content)
                  setMenuOpen(false)
                }}
                disabled={isSaving}
                className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? '保存中...' : '保存到草稿'}
              </button>
            )}
          </div>
        )}
      </div>
      <p className="pt-1 text-xs text-editorial-muted">{messageTime}</p>
    </div>
  )

  return (
    <div className="mb-6">
      {isUser ? (
        <div className="flex w-full flex-col items-end">
          <div className="mb-1 flex w-full justify-end">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
              <User className="h-5 w-5 text-slate-700" />
            </div>
          </div>
          <div className="flex w-full justify-end">
            <div className="w-full max-w-[82%]">
            {message.workflowInvocation && (
              <div className="mb-3 flex justify-end">
                <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
                {message.workflowInvocation}
                </div>
              </div>
            )}
            {referencedNews && (
              <div className="mb-3 flex justify-end">
                <div className="flex items-start gap-2 rounded-2xl border border-cyan-400/18 bg-cyan-400/10 p-3">
                  <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">引用新闻</p>
                    <p className="text-sm text-cyan-50">{referencedNews.title}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-start justify-end gap-3">
              {actionColumn}
              <div className="rounded-[24px] rounded-tr-md border border-blue-200 bg-gradient-to-br from-editorial-violet via-editorial-indigo to-editorial-cyan px-5 py-4 text-white shadow-[0_14px_34px_rgba(37,99,235,0.18)]">
                <p className="whitespace-pre-wrap text-[15px] leading-7">{removeMarkdown(message.content)}</p>
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col items-start">
          <div className="mb-1 flex w-full justify-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-editorial-violet via-editorial-indigo to-editorial-cyan shadow-[0_14px_30px_rgba(37,99,235,0.18)]">
              <Bot className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex w-full justify-start">
            <div className="w-full max-w-[82%]">
            {message.workflowInvocation && (
              <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                {message.workflowInvocation}
              </div>
            )}
            {referencedNews && (
              <div className="mb-3 flex items-start gap-2 rounded-2xl border border-cyan-400/18 bg-cyan-400/10 p-3">
                <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">引用新闻</p>
                  <p className="text-sm text-cyan-50">{referencedNews.title}</p>
                </div>
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="rounded-[24px] rounded-tl-md border border-slate-200 bg-white px-5 py-4 text-slate-900 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                <MarkdownRenderer
                  content={message.content}
                  className="text-[15px] leading-7 text-slate-800"
                  onCommandClick={onForwardToInput}
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
