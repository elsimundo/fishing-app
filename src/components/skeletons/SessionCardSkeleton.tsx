export function SessionCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-3 text-xs text-slate-700 shadow-sm animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded-full bg-slate-200" />
          <div className="h-3 w-1/2 rounded-full bg-slate-200" />
          <div className="h-3 w-1/3 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  )
}
