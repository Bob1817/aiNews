import { useState, useRef, useEffect } from 'react'
import { Send, RefreshCw } from 'lucide-react'
import { NewsCard } from '@/components/NewsCard'
import { ConversationItem } from '@/components/ConversationItem'
import { useToast } from '@/lib/toast'
import { useAppStore } from '@/store'
import type { NewsArticle, ConversationMessage } from '@/types'
import { chat as chatWithAi } from '@/lib/api/chat'
import { getErrorMessage } from '@/lib/errors'
import { getRecentNews } from '@/lib/api/news'
import { getMockChatResponse, getMockNewsArticles } from '@/lib/fallbacks'

export function Chat() {
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  const {
    newsArticles,
    conversationMessages,
    selectedNews,
    isLoading,
    setNewsArticles,
    addConversationMessage,
    setSelectedNews,
    setIsLoading,
  } = useAppStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversationMessages])

  useEffect(() => {
    // 从后端 API 获取新闻
    const fetchNews = async () => {
      try {
        setIsLoading(true)
        const news = await getRecentNews('1')
        
        // 检查返回的数据是否是数组
        if (Array.isArray(news)) {
          // 检查是否有新新闻
          const previousNewsIds = newsArticles.map(article => article.id)
          const newNews = news.filter(article => !previousNewsIds.includes(article.id))
          
          // 发送通知
          if (newNews.length > 0) {
            const latestNews = newNews[0]
            if (window.electronAPI) {
              window.electronAPI.sendNotification(
                '新闻更新',
                `最新新闻：${latestNews.title}`
              )
            }
          }
          
          setNewsArticles(news)
        } else {
          throw new Error('返回的数据格式不正确')
        }
      } catch (error) {
        console.error('获取新闻失败:', error)
        setNewsArticles(getMockNewsArticles())
        showToast({
          title: '新闻加载失败',
          message: '已切换为本地示例新闻，你仍然可以继续体验。',
          variant: 'info',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchNews()
    
    // 每5分钟检查一次新闻更新
    const intervalId = setInterval(fetchNews, 5 * 60 * 1000)
    
    return () => clearInterval(intervalId)
  }, [newsArticles, setIsLoading, setNewsArticles, showToast])

  const handleQuoteNews = (article: NewsArticle) => {
    setSelectedNews(article)
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      referencedNewsId: selectedNews?.id,
      timestamp: new Date().toISOString(),
    }

    addConversationMessage(userMessage)
    setInputMessage('')
    setIsLoading(true)

    try {
      const data = await chatWithAi({
        userId: '1',
        message: inputMessage,
        referencedNewsId: selectedNews?.id,
        history: conversationMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      })
      const aiMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
      }
      addConversationMessage(aiMessage)
    } catch (error) {
      console.error('AI 对话失败:', error)
      addConversationMessage(getMockChatResponse(selectedNews))
      showToast({
        title: 'AI 服务暂时不可用',
        message: `${getErrorMessage(error, '请求失败')}，已为你切换到本地演示回复。`,
        variant: 'info',
      })
    } finally {
      setIsLoading(false)
      setSelectedNews(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">今日新闻推送</h2>
            <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {newsArticles.map((article) => (
              <div key={article.id} className="w-80 flex-shrink-0">
                <NewsCard
                  article={article}
                  onQuote={handleQuoteNews}
                  isSelected={selectedNews?.id === article.id}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {conversationMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-4">
              <Send className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">开始创作新闻</h3>
            <p className="text-gray-500 max-w-md">
              选择上方的新闻进行引用，或直接输入您的需求，让 AI 帮您创作出专业的新闻稿件。
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {conversationMessages.map((message) => (
              <ConversationItem
                key={message.id}
                message={message}
                referencedNews={
                  message.referencedNewsId
                    ? newsArticles.find((n) => n.id === message.referencedNewsId)
                    : null
                }
              />
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-md border border-gray-200">
                  <p className="text-gray-500">AI 正在思考中...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          {selectedNews && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-blue-600">已引用:</span>
                <span className="text-sm text-blue-800">{selectedNews.title}</span>
              </div>
              <button
                onClick={() => setSelectedNews(null)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                取消
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={selectedNews ? '基于此新闻进行创作...' : '输入您的需求...'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
