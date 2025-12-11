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
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-xs text-slate-100 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Lifetime stats
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            Fishing at a glance
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-slate-300">Sessions</p>
          <p className="text-base font-semibold text-white">{sessionCount}</p>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-slate-300">Catches</p>
          <p className="text-base font-semibold text-white">{catchesCount}</p>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-slate-300">Total weight</p>
          <p className="text-base font-semibold text-white">
            {totalWeightKg.toFixed(1)} kg
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2 sm:text-xs">
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-slate-300">Personal best</p>
          <p className="text-[11px] font-semibold text-white sm:text-xs">
            {personalBestLabel}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-[10px] text-slate-300">Top species</p>
          <p className="text-[11px] font-semibold text-white sm:text-xs">
            {topSpeciesLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
