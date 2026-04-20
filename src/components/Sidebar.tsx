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
  LogOut,
  Workflow,
} from 'lucide-react'
import { clearAuthSession } from '@/lib/auth'
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
    <aside className="hidden w-72 flex-col border-r border-editorial-line bg-white/85 px-4 py-5 text-editorial-ink shadow-[10px_0_30px_rgba(15,23,42,0.04)] backdrop-blur-xl md:flex">
      <div className="surface-panel-soft relative mb-4 overflow-hidden p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-editorial-violet via-editorial-indigo to-editorial-cyan shadow-[0_14px_30px_rgba(37,99,235,0.18)]">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-editorial-violet/80">AI Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">AI 助手</h1>
            <p className="mt-1 text-sm text-editorial-muted">白天办公场景下的对话式工作流助手</p>
          </div>
        </div>
      </div>

      <div className="surface-panel-soft mb-4 px-4 py-3">
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
                className={`focus-ring flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
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

      <div className="mt-auto border-t border-slate-200 pt-4">
        <button
          className="focus-ring flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-slate-500" />
            <span>设置</span>
          </div>
          {isSettingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isSettingsOpen && (
          <div className="mt-2 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
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

            <div className="my-2 border-t border-slate-200"></div>

            <button
              className="focus-ring flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-rose-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => {
                clearAuthSession()
                navigate('/login')
              }}
              aria-label="登出"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">登出</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
