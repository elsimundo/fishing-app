export function SessionCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 text-xs animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded-full bg-muted" />
          <div className="h-3 w-1/2 rounded-full bg-muted" />
          <div className="h-3 w-1/3 rounded-full bg-muted/70" />
        </div>
      </div>
    </div>
  )
}
