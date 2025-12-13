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
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <section
        className="relative z-[210] w-full max-w-lg rounded-t-2xl bg-card px-4 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pt-3 shadow-xl sm:mb-6 sm:rounded-2xl border border-border"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="h-1 w-10 rounded-full bg-muted sm:hidden" />
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pt-1 pb-4 text-sm text-muted-foreground">
          {children}
        </div>
      </section>
    </div>
  )
}
