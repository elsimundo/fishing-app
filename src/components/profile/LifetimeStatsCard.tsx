import { Fish, Scale, Trophy, Target } from 'lucide-react'
import { useWeightFormatter } from '../../hooks/useWeightFormatter'

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
  const { formatWeight } = useWeightFormatter()

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 text-foreground">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <Trophy size={16} className="text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Lifetime Stats</h3>
          <p className="text-[10px] text-muted-foreground">Your fishing journey</p>
        </div>
      </div>

      {/* Primary stats - big numbers */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-background p-3 text-center">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <Target size={14} className="text-primary" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{sessionCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sessions</p>
        </div>
        <div className="rounded-xl bg-background p-3 text-center">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <Fish size={14} className="text-primary" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{catchesCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Catches</p>
        </div>
        <div className="rounded-xl bg-background p-3 text-center">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <Scale size={14} className="text-primary" />
          </div>
          <p className="text-xl font-bold tabular-nums">{formatWeight(totalWeightKg, { precision: 1 })}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Secondary stats - highlights */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-400">🏆 Personal Best</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            {personalBestLabel}
          </p>
        </div>
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-primary">🐟 Top Species</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            {topSpeciesLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
