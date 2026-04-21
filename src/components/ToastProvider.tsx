import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { ToastContext, type ToastInput, type ToastVariant } from '@/lib/toast'

interface ToastItem {
  id: string
  title: string
  message?: string
  variant: ToastVariant
}

function getToastIcon(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return CheckCircle2
    case 'error':
      return AlertCircle
    default:
      return Info
  }
}

function getToastStyles(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return 'border-green-200 bg-white text-slate-900'
    case 'error':
      return 'border-red-200 bg-white text-slate-900'
    default:
      return 'border-blue-200 bg-white text-slate-900'
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timeoutMap = useRef<Record<string, number>>({})

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))

    const timeoutId = timeoutMap.current[id]
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      delete timeoutMap.current[id]
    }
  }, [])

  const showToast = useCallback(
    ({ title, message, variant = 'info' }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((current) => [...current, { id, title, message, variant }])

      timeoutMap.current[id] = window.setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast]
  )

  useEffect(() => {
    const timeouts = timeoutMap.current

    return () => {
      Object.values(timeouts).forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2.5">
        {toasts.map((toast) => {
          const Icon = getToastIcon(toast.variant)

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm ${getToastStyles(toast.variant)}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${
                  toast.variant === 'success'
                    ? 'text-green-600'
                    : toast.variant === 'error'
                      ? 'text-red-600'
                      : 'text-blue-600'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.message && <p className="mt-1 text-sm text-slate-500">{toast.message}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                  aria-label="关闭提示"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
