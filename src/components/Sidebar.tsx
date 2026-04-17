import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Newspaper, Settings, Bot, Server, ChevronDown, ChevronUp } from 'lucide-react'
import { clearAuthSession } from '@/lib/auth'

export function Sidebar() {
  const location = useLocation()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const menuItems = [
    { path: '/chat', label: '对话创作', icon: MessageSquare },
    { path: '/news', label: '新闻管理', icon: Newspaper },
  ]

  const settingsItems = [
    { path: '/settings', label: '用户设置', icon: Settings },
    { path: '/config', label: '系统配置', icon: Server },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">AI 新闻助手</h1>
            <p className="text-xs text-gray-500">智能创作平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div 
          className="flex items-center justify-between gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5" />
            <span>设置</span>
          </div>
          {isSettingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>

        {isSettingsOpen && (
          <div className="mt-2 space-y-1">
            {settingsItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsSettingsOpen(false)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}

            <div className="border-t border-gray-100 my-2"></div>

            <div 
              className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
              onClick={() => {
                clearAuthSession()
                window.location.href = '/login'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="text-sm">登出</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
