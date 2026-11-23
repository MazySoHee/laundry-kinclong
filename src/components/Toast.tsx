'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'
type ToastState = { type: ToastType; message: string } | null

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback((type: ToastType, message: string) => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ type, message })
    timer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return { toast, show, hide }
}

export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null
  const ok = toast.type === 'success'

  return (
    <div
      className="fixed inset-x-4 z-50 mx-auto max-w-sm"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      role={ok ? 'status' : 'alert'}
      aria-live={ok ? 'polite' : 'assertive'}
    >
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
          ok
            ? 'border-teal-200 bg-teal-50 text-teal-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}
      >
        {ok ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        )}
        <span className="flex-1">{toast.message}</span>
        <button
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="-mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}