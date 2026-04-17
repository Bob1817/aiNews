import { useState, useRef, useEffect } from 'react'
import { Send, RefreshCw, ChevronLeft, ChevronRight, Bot } from 'lucide-react'
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
  const [currentPage, setCurrentPage] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const newsContainerRef = useRef<HTMLDivElement>(null)
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

  // 获取新闻
  const fetchNews = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }
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
        setCurrentPage(0) // 重置到第一页
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
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchNews()

    // 每5分钟检查一次新闻更新
    const intervalId = setInterval(() => fetchNews(false), 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [setIsLoading, setNewsArticles, showToast])

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
      console.log('开始发送 AI 对话请求')
      const data = await chatWithAi({
        userId: '1',
        message: inputMessage,
        referencedNewsId: selectedNews?.id,
        history: conversationMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      })
      console.log('AI 对话请求成功:', data)
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

  // 刷新新闻
  const handleRefreshNews = async () => {
    setIsRefreshing(true)
    await fetchNews(false)
  }

  // 左右滑动导航
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
      if (newsContainerRef.current) {
        newsContainerRef.current.scrollLeft -= 320 * 3 // 每次滚动3个新闻卡片宽度
      }
    }
  }

  const handleNextPage = () => {
    const totalPages = Math.ceil(newsArticles.length / 6) - 1
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      if (newsContainerRef.current) {
        newsContainerRef.current.scrollLeft += 320 * 3 // 每次滚动3个新闻卡片宽度
      }
    }
  }

  // 每页显示6个新闻
  const itemsPerPage = 6
  const startIndex = currentPage * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentNews = newsArticles.slice(startIndex, endIndex)
  const totalPages = Math.ceil(newsArticles.length / itemsPerPage)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">今日新闻推送</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-xs">
                  第 {currentPage + 1} / {totalPages} 页
                </span>
                {totalPages > 1 && (
                  <>
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 0}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages - 1}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={handleRefreshNews}
                disabled={isRefreshing || isLoading}
                className="flex items-center gap-2 text-sm text-anthropic-mid-gray hover:text-anthropic-dark disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="刷新新闻"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
          </div>
        </div>

        <div className="relative p-4">
          {totalPages > 1 && (
            <>
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}

          <div
            ref={newsContainerRef}
            className="overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="flex gap-4 min-w-max">
              {currentNews.map((article) => (
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
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {conversationMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-anthropic-orange to-anthropic-blue rounded-2xl flex items-center justify-center mb-4">
                <Send className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-anthropic-dark mb-2">开始创作新闻</h3>
              <p className="text-anthropic-mid-gray max-w-md">
                选择上方的新闻进行引用，或直接输入您的需求，让 AI 帮您创作出专业的新闻稿件。
              </p>
            </div>
        ) : (
          <div className="space-y-6" style={{ contentVisibility: 'auto' }}>
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
              <div className="flex flex-col items-start mb-6">
                <div className="flex justify-start w-full mb-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white animate-pulse" />
                  </div>
                </div>
                <div className="max-w-[80%] align-self-start">
                  <div className="px-4 py-3 rounded-2xl bg-white text-gray-900 rounded-tl-md border border-gray-200">
                    <div className="flex gap-2 items-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-gray-500 mt-2">AI 正在分析新闻内容...</p>
                    <p className="text-gray-400 text-sm mt-1">正在思考创作角度...</p>
                  </div>
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
            <div className="mb-3 p-3 bg-anthropic-blue/10 border border-anthropic-blue/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-anthropic-blue">已引用:</span>
                <span className="text-sm text-anthropic-blue">{selectedNews.title}</span>
              </div>
              <button
                onClick={() => setSelectedNews(null)}
                className="text-anthropic-blue hover:text-anthropic-dark text-sm"
                aria-label="取消引用"
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                } else if (e.key === 'Escape') {
                  setInputMessage('');
                  setSelectedNews(null);
                }
              }}
              placeholder={selectedNews ? '基于此新闻进行创作...' : '输入您的需求...'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-anthropic-orange focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-anthropic-orange text-white rounded-xl hover:bg-anthropic-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              aria-label="发送消息"
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
