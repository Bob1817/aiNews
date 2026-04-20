import { User, Bot, Quote, Save, Copy, Repeat } from 'lucide-react'
import type { ConversationMessage, NewsArticle } from '@/types'

interface ConversationItemProps {
  message: ConversationMessage
  referencedNews?: NewsArticle | null
  onSaveToDraft?: (content: string) => void
  onForwardToInput?: (content: string) => void
  isSaving?: boolean
}

export function ConversationItem({ message, referencedNews, onSaveToDraft, onForwardToInput, isSaving }: ConversationItemProps) {
  const isUser = message.role === 'user'

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      // 可以添加一个复制成功的提示
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  // 去除 markdown 格式字符
  const removeMarkdown = (text: string) => {
    return text
      // 去除标题标记
      .replace(/^#+/gm, '')
      // 去除加粗标记
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // 去除斜体标记
      .replace(/\*(.*?)\*/g, '$1')
      // 去除删除线
      .replace(/~~(.*?)~~/g, '$1')
      // 去除代码块标记
      .replace(/```[\s\S]*?```/g, '')
      // 去除行内代码
      .replace(/`(.*?)`/g, '$1')
      // 去除链接标记
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 去除引用标记
      .replace(/^>+/gm, '')
      // 去除水平分隔线
      .replace(/^---+/gm, '')
      // 去除多余的空白行
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

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
              <p className="whitespace-pre-wrap">{removeMarkdown(message.content)}</p>
            </div>
            <div className="flex mt-2 px-1 gap-1">
              <button
                onClick={() => handleCopy(message.content)}
                className="p-2 text-blue-200 hover:text-white hover:bg-blue-700 rounded-lg transition-colors relative group"
                title="复制"
              >
                <Copy className="w-4 h-4" />
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  复制
                </span>
              </button>
              {onForwardToInput && (
                <button
                  onClick={() => onForwardToInput(message.content)}
                  className="p-2 text-blue-200 hover:text-white hover:bg-blue-700 rounded-lg transition-colors relative group"
                  title="转发"
                >
                  <Repeat className="w-4 h-4" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    转发
                  </span>
                </button>
              )}
              <p className="text-xs text-gray-400 ml-auto">
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
              <p className="whitespace-pre-wrap">{removeMarkdown(message.content)}</p>
            </div>
            <div className="flex items-center gap-1 mt-2 px-1">
              <button
                onClick={() => handleCopy(message.content)}
                className="p-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative group"
                title="复制"
              >
                <Copy className="w-4 h-4" />
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  复制
                </span>
              </button>
              {onForwardToInput && (
                <button
                  onClick={() => onForwardToInput(message.content)}
                  className="p-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative group"
                  title="转发"
                >
                  <Repeat className="w-4 h-4" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    转发
                  </span>
                </button>
              )}
              {onSaveToDraft && (
                <button
                  onClick={() => onSaveToDraft(message.content)}
                  disabled={isSaving}
                  className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors relative group"
                  title={isSaving ? '保存中...' : '保存到草稿'}
                >
                  <Save className="w-4 h-4" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {isSaving ? '保存中...' : '保存到草稿'}
                  </span>
                </button>
              )}
              <p className="text-xs text-gray-400 ml-auto">
                {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
