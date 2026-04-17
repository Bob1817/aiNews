import { createContext, useContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastInput {
  title: string
  message?: string
  variant?: ToastVariant
}

export interface ToastContextValue {
  showToast: (input: ToastInput) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast 必须在 ToastProvider 内使用')
  }

  return context
}
