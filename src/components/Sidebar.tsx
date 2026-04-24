import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  MessageSquarePlus,
  History,
  Newspaper,
  Settings,
  Bot,
  Server,
  ChevronDown,
  ChevronUp,
  Workflow,
} from 'lucide-react'
import { useAppStore } from '@/store'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { startNewConversation } = useAppStore()

  const settingsItems = [
    { path: '/workflows', label: '工作流库', icon: Workflow },
    { path: '/config', label: '系统配置', icon: Server },
  ]

  const workspaceItems = [
    {
      path: '/chat/new',
      label: '新建任务',
      icon: MessageSquarePlus,
      onClick: () => {
        startNewConversation()
        navigate('/chat/new')
      },
    },
    {
      path: '/history',
      label: '任务历史',
      icon: History,
      onClick: () => navigate('/history'),
    },
    {
      path: '/news',
      label: '任务结果',
      icon: Newspaper,
      onClick: () => navigate('/news'),
    },
  ]

  return (
    <aside className="hidden w-64 flex-col border-r border-editorial-line bg-white/90 px-3 py-4 text-editorial-ink shadow-[8px_0_24px_rgba(15,23,42,0.03)] backdrop-blur-xl md:flex">
      <div className="surface-panel-soft mb-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-[0_10px_24px_rgba(37,99,235,0.2)]">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">AI 助手</h1>
            <p className="mt-0.5 text-sm text-editorial-muted">工作台</p>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="grid gap-3">
          {workspaceItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.path === '/chat/new'
                ? location.pathname.startsWith('/chat')
                : location.pathname === item.path

            return (
              <button
                key={item.path}
                onClick={item.onClick}
                className={`focus-ring flex items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-auto border-t border-slate-200 pt-3">
        <button
          className="focus-ring flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-slate-500" />
            <span>设置</span>
          </div>
          {isSettingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isSettingsOpen && (
          <div className="mt-2 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            {settingsItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`focus-ring flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  onClick={() => setIsSettingsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
