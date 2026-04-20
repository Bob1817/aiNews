import { User, Bot, Quote, Save } from 'lucide-react'
import type { ConversationMessage, NewsArticle } from '@/types'

interface ConversationItemProps {
  message: ConversationMessage
  referencedNews?: NewsArticle | null
  onSaveToDraft?: (content: string) => void
  isSaving?: boolean
}

export function ConversationItem({ message, referencedNews, onSaveToDraft, isSaving }: ConversationItemProps) {
  const isUser = message.role === 'user'

  return (
    <div className="mb-6">
      {isUser ? (
        // 用户消息 - 头像在右侧
        <div className="flex flex-col items-end">
          <div className="flex justify-end w-full mb-1">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
          </div>
          <div className="max-w-[80%] align-self-end">
            {referencedNews && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <Quote className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-600 font-medium mb-1">引用新闻</p>
                  <p className="text-sm text-blue-800">{referencedNews.title}</p>
                </div>
              </div>
            )}
            <div className="px-4 py-3 rounded-2xl bg-blue-600 text-white rounded-tr-md">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="flex justify-end mt-1 px-1">
              <p className="text-xs text-gray-400">
                {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      ) : (
        // AI 消息 - 头像在左侧
        <div className="flex flex-col items-start">
          <div className="flex justify-start w-full mb-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="max-w-[80%] align-self-start">
            {referencedNews && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <Quote className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-600 font-medium mb-1">引用新闻</p>
                  <p className="text-sm text-blue-800">{referencedNews.title}</p>
                </div>
              </div>
            )}
            <div className="px-4 py-3 rounded-2xl bg-white text-gray-900 rounded-tl-md border border-gray-200">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="flex items-center gap-3 mt-2 px-1">
              <p className="text-xs text-gray-400">
                {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {onSaveToDraft && (
                <button
                  onClick={() => onSaveToDraft(message.content)}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  {isSaving ? '保存中...' : '保存到草稿'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
