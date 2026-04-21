import { Clock, Trash2 } from 'lucide-react'
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

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <div className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col gap-6 px-6 py-6 lg:px-10">
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">任务历史</h1>
              <p className="mt-2 text-sm text-slate-600">
                打开已有对话，继续处理任务。
              </p>
            </div>


          </div>
        </section>

        {conversationHistories.length === 0 ? (
          <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white px-6 text-center shadow-[0_16px_36px_rgba(15,23,42,0.04)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-100">
              <Clock className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-900">还没有任务历史</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              新建一次任务后会自动生成记录。
            </p>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {conversationHistories.map((history) => (
              <article
                key={history.id}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)] transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() => handleOpenHistory(history.id)}
                    className="flex-1 text-left"
                  >
                    <p className="text-lg font-semibold text-slate-900">{history.title}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {history.messages.length} 条消息 · 最近更新于{' '}
                      {new Date(history.updatedAt).toLocaleString('zh-CN')}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
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
