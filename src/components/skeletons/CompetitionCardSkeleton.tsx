export function CompetitionCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-card border border-border animate-pulse">
      <div className="h-40 bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded-full bg-muted" />
        <div className="h-3 w-full rounded-full bg-muted" />
        <div className="h-3 w-2/3 rounded-full bg-muted/70" />
      </div>
    </div>
  )
}
