export function CompetitionCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm animate-pulse">
      <div className="h-40 bg-slate-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded-full bg-slate-200" />
        <div className="h-3 w-full rounded-full bg-slate-200" />
        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
      </div>
    </div>
  )
}
