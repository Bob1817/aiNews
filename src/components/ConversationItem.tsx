import { User, Bot, Quote } from 'lucide-react'
import type { ConversationMessage, NewsArticle } from '@/types'

interface ConversationItemProps {
  message: ConversationMessage
  referencedNews?: NewsArticle | null
}

export function ConversationItem({ message, referencedNews }: ConversationItemProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={`max-w-2xl ${isUser ? 'order-1' : ''}`}>
        {referencedNews && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Quote className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-600 font-medium mb-1">引用新闻</p>
              <p className="text-sm text-blue-800">{referencedNews.title}</p>
            </div>
          </div>
        )}

        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-md'
              : 'bg-white text-gray-900 rounded-tl-md border border-gray-200'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        <p className="text-xs text-gray-400 mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {isUser && (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-gray-500" />
        </div>
      )}
    </div>
  )
}
