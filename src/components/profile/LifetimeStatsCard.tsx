interface LifetimeStatsCardProps {
  sessionCount: number
  catchesCount: number
  totalWeightKg: number
  personalBestLabel: string
  topSpeciesLabel: string
}

export function LifetimeStatsCard({
  sessionCount,
  catchesCount,
  totalWeightKg,
  personalBestLabel,
  topSpeciesLabel,
}: LifetimeStatsCardProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-primary/30 via-background to-card p-4 text-xs text-foreground shadow border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Lifetime stats
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Fishing at a glance
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-muted-foreground">Sessions</p>
          <p className="text-base font-semibold text-foreground">{sessionCount}</p>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-muted-foreground">Catches</p>
          <p className="text-base font-semibold text-foreground">{catchesCount}</p>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-muted-foreground">Total weight</p>
          <p className="text-base font-semibold text-foreground">
            {totalWeightKg.toFixed(1)} kg
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2 sm:text-xs">
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-muted-foreground">Personal best</p>
          <p className="text-[11px] font-semibold text-foreground sm:text-xs">
            {personalBestLabel}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-muted-foreground">Top species</p>
          <p className="text-[11px] font-semibold text-foreground sm:text-xs">
            {topSpeciesLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
