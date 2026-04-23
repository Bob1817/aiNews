import type { ReactNode } from 'react'
import type { WorkflowActionLink, WorkflowResultPresentation } from '@/lib/utils/workflowResultPresentation'
import { NewsDigestResultCard } from './NewsDigestResultCard'
import { TaxReportResultCard } from './TaxReportResultCard'

export interface WorkflowResultCardProps {
  presentation: WorkflowResultPresentation
  onActionClick?: (action: string) => void
  className?: string
}

interface WorkflowResultShellProps {
  eyebrow: string
  title: string
  subtitle?: string
  accentClassName?: string
  children: ReactNode
}

interface WorkflowActionBarProps {
  actions: WorkflowActionLink[]
  onActionClick?: (action: string) => void
}

export function WorkflowResultCard({
  presentation,
  onActionClick,
  className,
}: WorkflowResultCardProps) {
  const wrapperClassName = className ? ` ${className}` : ''

  if (presentation.kind === 'tax-report') {
    return (
      <div className={wrapperClassName.trim()}>
        <TaxReportResultCard presentation={presentation} onActionClick={onActionClick} />
      </div>
    )
  }

  return (
    <div className={wrapperClassName.trim()}>
      <NewsDigestResultCard presentation={presentation} onActionClick={onActionClick} />
    </div>
  )
}

export function WorkflowResultShell({
  eyebrow,
  title,
  subtitle,
  accentClassName = 'from-slate-900 via-slate-800 to-slate-700',
  children,
}: WorkflowResultShellProps) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <div className={`bg-gradient-to-r ${accentClassName} px-5 py-4 text-white`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">{eyebrow}</p>
        <h3 className="mt-2 text-[24px] font-semibold leading-tight">{title}</h3>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{subtitle}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

export function WorkflowActionBar({ actions, onActionClick }: WorkflowActionBarProps) {
  if (!actions.length) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {actions.map((action, index) => {
        const isPrimary = index === 0
        const className = isPrimary
          ? 'inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700'
          : 'inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100'

        if (action.href) {
          return (
            <a
              key={`${action.label}-${action.href}`}
              className={className}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {action.label}
            </a>
          )
        }

        return (
          <button
            key={`${action.label}-${action.action ?? index}`}
            type="button"
            className={className}
            onClick={() => {
              if (action.action) {
                onActionClick?.(action.action)
              }
            }}
          >
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
