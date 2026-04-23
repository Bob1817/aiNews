import type { TaxReportPresentation } from '@/lib/utils/workflowResultPresentation'
import { WorkflowActionBar, WorkflowResultShell } from './WorkflowResultCard'

interface TaxReportResultCardProps {
  presentation: TaxReportPresentation
  onActionClick?: (action: string) => void
}

export function TaxReportResultCard({
  presentation,
  onActionClick,
}: TaxReportResultCardProps) {
  const isSuccess = presentation.title.includes('成功')
  const eyebrow = isSuccess ? 'Tax Workflow Ready' : 'Tax Workflow Alert'
  const statusLabel = isSuccess ? '已完成' : '需处理'
  const accentClassName = isSuccess
    ? 'from-slate-900 via-slate-800 to-blue-900'
    : 'from-rose-900 via-rose-800 to-amber-800'

  return (
    <WorkflowResultShell
      eyebrow={eyebrow}
      title={presentation.title}
      subtitle={presentation.description}
      accentClassName={accentClassName}
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">处理状态</p>
            <p className="mt-1 text-sm text-slate-600">标准模板已生成，可直接下载或查看 output 文件夹。</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {presentation.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <WorkflowActionBar actions={presentation.actions} onActionClick={onActionClick} />
        </div>
      </div>
    </WorkflowResultShell>
  )
}
