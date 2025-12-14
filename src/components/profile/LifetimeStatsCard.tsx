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
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-lg">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          <Trophy size={16} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Lifetime Stats</h3>
          <p className="text-[10px] text-white/60">Your fishing journey</p>
        </div>
      </div>

      {/* Primary stats - big numbers */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/5 p-3 text-center backdrop-blur">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
            <Target size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{sessionCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">Sessions</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center backdrop-blur">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
            <Fish size={14} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{catchesCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">Catches</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center backdrop-blur">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
            <Scale size={14} className="text-purple-400" />
          </div>
          <p className="text-xl font-bold tabular-nums">{formatWeight(totalWeightKg, { precision: 1 })}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">Total</p>
        </div>
      </div>

      {/* Secondary stats - highlights */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-300/80">🏆 Personal Best</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {personalBestLabel}
          </p>
        </div>
        <div className="rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-cyan-300/80">🐟 Top Species</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {topSpeciesLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
