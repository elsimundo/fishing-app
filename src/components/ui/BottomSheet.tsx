import type { ReactNode } from 'react'

type BottomSheetProps = {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <section
        className="relative z-10 w-full max-w-lg rounded-t-2xl bg-surface px-4 pb-6 pt-3 shadow-xl sm:mb-6 sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
          <h2 className="text-sm font-medium text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pt-1 text-sm text-slate-700">
          {children}
        </div>
      </section>
    </div>
  )
}
