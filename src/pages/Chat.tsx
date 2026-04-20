import { useState, useRef, useEffect } from 'react'
import { Send, RefreshCw, ChevronLeft, ChevronRight, Bot, Server, Settings } from 'lucide-react'
import { NewsCard } from '@/components/NewsCard'
import { ConversationItem } from '@/components/ConversationItem'
import { useToast } from '@/lib/toast'
import { useAppStore } from '@/store'
import type { NewsArticle, ConversationMessage, SavedNews } from '@/types'
import { chat as chatWithAi } from '@/lib/api/chat'
import { getErrorMessage } from '@/lib/errors'
import { getRecentNews, createSavedNews } from '@/lib/api/news'
import { getConfig } from '@/lib/api/config'
import { getMockNewsArticles } from '@/lib/fallbacks'
import { Link, useLocation } from 'react-router-dom'

export function Chat() {
  const location = useLocation()
  const [inputMessage, setInputMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasAiModelConfig, setHasAiModelConfig] = useState(true)
  const [isCheckingConfig, setIsCheckingConfig] = useState(true)
  const [isSavingToDraft, setIsSavingToDraft] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const newsContainerRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  const {
    newsArticles,
    conversationMessages,
    selectedNews,
    isLoading,
    savedNews,
    setNewsArticles,
    addConversationMessage,
    setSelectedNews,
    setIsLoading,
    setSavedNews,
  } = useAppStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversationMessages])

  // 检查 AI 模型配置
  useEffect(() => {
    const checkAiModelConfig = async () => {
      try {
        setIsCheckingConfig(true)
        const config = await getConfig('1')
        console.log('AI 模型配置检查结果:', config)
        // 检查是否有有效的 AI 模型配置
        // 对于 llama.cpp 和 ollama 模型，modelName 不是必需的
        const hasValidConfig = !!(config.aiModel.id && config.aiModel.name && 
          (config.aiModel.modelName || ['llamacpp', 'ollama'].includes(config.aiModel.provider)))
        console.log('是否有有效配置:', hasValidConfig)
        setHasAiModelConfig(hasValidConfig)
      } catch (error) {
        console.error('检查 AI 模型配置失败:', error)
        setHasAiModelConfig(false)
      } finally {
        setIsCheckingConfig(false)
      }
    }

    checkAiModelConfig()
  }, [location.pathname])

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
      showToast({
        title: 'AI 服务暂时不可用',
        message: `${getErrorMessage(error, '请求失败')}，请检查 AI 模型配置和服务状态。`,
        variant: 'error',
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

  // 保存到草稿
  const handleSaveToDraft = async (content: string) => {
    setIsSavingToDraft(true)
    try {
      // 从内容中提取标题（第一行）
      const lines = content.trim().split('\n')
      let title = 'AI 创作的新闻'
      let actualContent = content

      if (lines.length > 0) {
        // 尝试提取标题（通常第一行或带 # 标记的行）
        const firstLine = lines[0].trim()
        if (firstLine.startsWith('#')) {
          title = firstLine.replace(/^#+\s*/, '').trim()
          actualContent = lines.slice(1).join('\n').trim()
        } else if (firstLine.length > 0 && firstLine.length <= 100) {
          title = firstLine
          actualContent = lines.slice(1).join('\n').trim()
          // 如果剩下的内容太少，可能第一行不是标题
          if (actualContent.length < 50) {
            title = 'AI 创作的新闻'
            actualContent = content
          }
        }
      }

      const data = await createSavedNews({
        userId: '1',
        title,
        content: actualContent || content,
        categories: [],
        industries: [],
      })

      setSavedNews([data.data as SavedNews, ...savedNews])
      showToast({
        title: '保存成功',
        message: '新闻已保存到草稿箱',
        variant: 'success',
      })
    } catch (error) {
      console.error('保存到草稿失败:', error)
      showToast({
        title: '保存失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSavingToDraft(false)
    }
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

  if (isCheckingConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-4 border-anthropic-orange rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">加载中...</p>
      </div>
    )
  }

  if (!hasAiModelConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 px-6">
        <div className="w-24 h-24 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
          <Server className="w-12 h-12 text-purple-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">未配置 AI 模型</h2>
        <p className="text-gray-600 text-center max-w-md mb-8">
          首次使用前需要配置 AI 模型。请选择以下方式之一进行配置：
        </p>
        <div className="space-y-4 w-full max-w-md">
          <Link
            to="/config"
            className="flex items-center justify-center gap-3 px-6 py-3 bg-anthropic-orange text-white rounded-xl hover:bg-anthropic-dark transition-colors"
          >
            <Settings className="w-5 h-5" />
            前往配置页面
          </Link>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">支持的 AI 模型</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>OpenAI (GPT 系列)</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Ollama (本地模型)</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>llama.cpp (本地模型)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

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
                onSaveToDraft={message.role === 'assistant' ? handleSaveToDraft : undefined}
                isSaving={isSavingToDraft}
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
