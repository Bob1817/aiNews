import type { NewsDigestPresentation } from '@/lib/utils/workflowResultPresentation'
import { WorkflowActionBar, WorkflowResultShell } from './WorkflowResultCard'

interface NewsDigestResultCardProps {
  presentation: NewsDigestPresentation
  onActionClick?: (action: string) => void
}

export function NewsDigestResultCard({
  presentation,
  onActionClick,
}: NewsDigestResultCardProps) {
  return (
    <WorkflowResultShell
      eyebrow="News Digest"
      title={presentation.headerTitle}
      subtitle="编辑式简报视图，保留摘要阅读节奏，同时将操作区固定到底部。"
      accentClassName="from-stone-900 via-slate-800 to-sky-900"
    >
      <div className="space-y-5">
        {(presentation.keywordLine || presentation.focusLine) && (
          <div className="grid gap-3 md:grid-cols-2">
            {presentation.keywordLine && (
              <div className="rounded-2xl border border-slate-200 bg-stone-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-400">本次关键词</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{presentation.keywordLine}</p>
              </div>
            )}
            {presentation.focusLine && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">关注点</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{presentation.focusLine}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {presentation.items.map((item) => (
            <article
              key={`${item.index}-${item.title}`}
              className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    第 {item.index} 条
                  </div>
                  <h4 className="max-w-3xl text-[22px] font-semibold leading-8 text-slate-900">{item.title}</h4>
                </div>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
                  >
                    查看原文
                  </a>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.source && (
                  <span className="rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-700">
                    来源 {item.source}
                  </span>
                )}
                {item.publishedAt && (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                    发布时间 {item.publishedAt}
                  </span>
                )}
                {item.keyword && (
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sm text-sky-700">
                    关键词 {item.keyword}
                  </span>
                )}
              </div>

              <ul className="mt-5 space-y-3">
                {item.summary.map((line) => (
                  <li key={line} className="flex gap-3 text-[15px] leading-7 text-slate-700">
                    <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <WorkflowActionBar actions={item.actions} onActionClick={onActionClick} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </WorkflowResultShell>
  )
}
