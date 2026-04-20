import { Clock, MessageSquarePlus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/lib/toast'
import { useAppStore } from '@/store'

export function History() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const {
    conversationHistories,
    removeConversationHistory,
    setCurrentConversationId,
    loadConversationMessages,
    startNewConversation,
  } = useAppStore()

  const handleOpenHistory = (historyId: string) => {
    const history = conversationHistories.find((item) => item.id === historyId)
    if (!history) {
      return
    }

    setCurrentConversationId(history.id)
    loadConversationMessages(history.messages)
    navigate(`/chat/${history.id}`)
    showToast({
      title: '已进入任务对话',
      message: '你可以在该记录基础上继续对话。',
      variant: 'success',
    })
  }

  const handleDeleteHistory = (historyId: string) => {
    removeConversationHistory(historyId)
    showToast({
      title: '删除成功',
      message: '任务历史已移除。',
      variant: 'success',
    })
  }

  const handleCreateTask = () => {
    startNewConversation()
    navigate('/chat/new')
  }

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <div className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col gap-6 px-6 py-6 lg:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
                Task History
              </p>
              <h1 className="mt-3 font-display text-3xl text-slate-900 md:text-4xl">
                任务历史
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                这里会自动记录每次从“新建任务”开启的对话。点击任意记录，就能回到对应任务继续推进，不需要重新描述上下文。
              </p>
            </div>

            <button
              onClick={handleCreateTask}
              className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <MessageSquarePlus className="h-4 w-4" />
              新建任务
            </button>
          </div>
        </section>

        {conversationHistories.length === 0 ? (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-white/80 px-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.04)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-slate-100">
              <Clock className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-slate-900">还没有任务历史</h2>
            <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
              从左侧“新建任务”发起一次对话后，系统会自动创建任务记录并在后续对话中持续更新。
            </p>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {conversationHistories.map((history) => (
              <article
                key={history.id}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_55px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() => handleOpenHistory(history.id)}
                    className="flex-1 text-left"
                  >
                    <p className="text-lg font-semibold text-slate-900">{history.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      {history.messages.length} 条消息 · 最近更新于{' '}
                      {new Date(history.updatedAt).toLocaleString('zh-CN')}
                    </p>
                    <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-600">
                      {history.messages
                        .slice(-1)[0]
                        ?.content?.slice(0, 120) || '当前记录暂无可预览内容。'}
                    </p>
                  </button>

                  <button
                    onClick={() => handleDeleteHistory(history.id)}
                    className="focus-ring rounded-2xl border border-rose-200 bg-rose-50 p-2.5 text-rose-700 transition hover:bg-rose-100"
                    aria-label="删除任务历史"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
