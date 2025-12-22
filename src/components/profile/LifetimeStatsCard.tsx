import { Fish, Scale, Trophy, Target } from 'lucide-react'
import { useWeightFormatter } from '../../hooks/useWeightFormatter'

interface LifetimeStatsCardProps {
  sessionCount: number
  catchesCount: number
  totalWeightKg: number
  personalBestLabel: string
  topSpeciesLabel: string
  onSessionsClick?: () => void
  onCatchesClick?: () => void
}

export function LifetimeStatsCard({
  sessionCount,
  catchesCount,
  totalWeightKg,
  personalBestLabel,
  topSpeciesLabel,
  onSessionsClick,
  onCatchesClick,
}: LifetimeStatsCardProps) {
  const { formatWeight } = useWeightFormatter()

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-slate-800/50 p-4 text-foreground">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={18} className="text-muted-foreground" />
        <div>
          <h3 className="text-sm font-bold">Lifetime Stats</h3>
          <p className="text-[10px] text-muted-foreground">Your fishing journey</p>
        </div>
      </div>

      {/* Primary stats - big numbers */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onSessionsClick}
          disabled={!onSessionsClick}
          className="text-center rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 disabled:cursor-default disabled:hover:border-border"
        >
          <Target size={16} className="mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-2xl font-bold tabular-nums">{sessionCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sessions</p>
        </button>
        <button
          type="button"
          onClick={onCatchesClick}
          disabled={!onCatchesClick}
          className="text-center rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 disabled:cursor-default disabled:hover:border-border"
        >
          <Fish size={16} className="mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-2xl font-bold tabular-nums">{catchesCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Catches</p>
        </button>
        <div className="text-center rounded-xl border border-border bg-background p-3">
          <Scale size={16} className="mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-xl font-bold tabular-nums">{formatWeight(totalWeightKg, { precision: 1 })}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Secondary stats - highlights */}
      <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy size={12} className="text-yellow-500" />
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Personal Best</p>
          </div>
          <p className="truncate text-sm font-semibold text-foreground">
            {personalBestLabel}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Fish size={12} className="text-muted-foreground" />
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Top Species</p>
          </div>
          <p className="truncate text-sm font-semibold text-foreground">
            {topSpeciesLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
