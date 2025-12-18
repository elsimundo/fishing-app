import { useState } from 'react'
import { Fish, ChevronDown, ChevronUp, Loader2, Trophy, Clock, Users, Activity, Target } from 'lucide-react'
import { useLocalIntel } from '../../hooks/useLocalIntel'
import { formatDistanceToNow } from 'date-fns'
import type { FishingPreference } from '../../types'
import { useWeightFormatter } from '../../hooks/useWeightFormatter'
import { useNavigate } from 'react-router-dom'

interface LocalIntelCardProps {
  lat: number | null
  lng: number | null
  bounds?: { north: number; south: number; east: number; west: number } | null
  waterPreference?: FishingPreference | null
}

export function LocalIntelCard({ lat, lng, bounds, waterPreference }: LocalIntelCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { formatWeight } = useWeightFormatter()
  const navigate = useNavigate()
  const { data: intel, isLoading, error } = useLocalIntel(lat, lng, bounds, 30, lat !== null && lng !== null, waterPreference)

  if (!lat || !lng) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Fish size={20} />
          <span className="text-sm font-medium text-foreground">Local Intel</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Search a location to see fishing intel</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Loader2 size={20} className="animate-spin text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Loading Intel</p>
            <p className="text-xs text-muted-foreground">Analysing local catch data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !intel) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Fish size={20} />
          <span className="text-sm font-medium text-foreground">Local Intel</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Unable to load fishing intel</p>
      </div>
    )
  }

  const hasData = intel.totalCatches > 0

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Fish size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Local Intel</p>
            {hasData ? (
              <p className="text-xs text-muted-foreground">
                {intel.totalCatches} catches · {intel.uniqueAnglers} anglers
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No catches logged nearby yet</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">Zones are ~1km hotspots. Exact marks stay private.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick preview */}
          {hasData && intel.topSpecies[0] && !expanded && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Top Species</p>
              <p className="text-sm font-semibold text-foreground">{intel.topSpecies[0].species}</p>
            </div>
          )}
          {expanded ? (
            <ChevronUp size={20} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={20} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4">
          {!hasData ? (
            <div className="mt-3 rounded-lg bg-muted p-4 text-center">
              <Fish size={32} className="mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">No catches logged nearby</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Be the first to log a catch in this area!
              </p>
            </div>
          ) : (
            <>
              {/* Natural-language summary */}
              {(() => {
                const topSpecies = intel.topSpecies[0]?.species
                const bestPeriod = intel.catchesByTimeOfDay[0]?.period
                if (!topSpecies && !bestPeriod) return null

                return (
                  <div className="mt-3 rounded-lg bg-muted p-3">
                    <p className="text-[11px] text-foreground">
                      In the last {intel.periodDays} days,
                      {bestPeriod && (
                        <>
                          {' '}this zone has fished best in <span className="font-semibold text-foreground">{bestPeriod.toLowerCase()}</span>
                        </>
                      )}
                      {topSpecies && (
                        <>
                          {' '}for <span className="font-semibold text-foreground">{topSpecies}</span>
                        </>
                      )}
                      {intel.totalCatches >= 3 && (
                        <>
                          {' '}
                          based on {intel.totalCatches} catches from {intel.uniqueAnglers}{' '}
                          {intel.uniqueAnglers === 1 ? 'angler' : 'anglers'}.
                        </>
                      )}
                    </p>
                  </div>
                )
              })()}

              {/* Stats Summary */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{intel.totalCatches}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Catches</p>
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3 text-center">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{intel.uniqueAnglers}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-500">Anglers</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-3 text-center">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{intel.topSpecies.length}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">Species</p>
                </div>
              </div>

              {/* Top Species */}
              {intel.topSpecies.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    🐟 Top Species
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {intel.topSpecies.map((s, idx) => (
                      <div
                        key={s.species}
                        className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                          <span className="text-sm font-medium text-foreground">{s.species}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-emerald-400">{s.count}</span>
                          {s.avgWeight && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              avg {formatWeight(s.avgWeight, { precision: 1 })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Baits */}
              {intel.topBaits.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    🪱 Popular Baits
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {intel.topBaits.map((b) => (
                      <span
                        key={b.bait}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
                      >
                        {b.bait}
                        <span className="text-amber-500">({b.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Times */}
              {intel.catchesByTimeOfDay.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Clock size={12} className="mr-1 inline" />
                    Best Times
                  </p>
                  <div className="mt-2 space-y-1">
                    {intel.catchesByTimeOfDay.slice(0, 3).map((t) => (
                      <div key={t.period} className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${t.percentage}%` }}
                          />
                        </div>
                        <span className="w-20 text-xs text-muted-foreground">{t.period}</span>
                        <span className="w-10 text-right text-xs font-medium text-foreground">
                          {t.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {intel.recentActivity.catchesLast24h > 0 && (
                <div className="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-emerald-400" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                      Recent Activity
                    </p>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-emerald-400">
                      {intel.recentActivity.catchesLast24h}
                    </span>
                    <span className="text-sm text-emerald-500">catches in last 24hrs</span>
                  </div>
                  {intel.recentActivity.lastCatchTime && (
                    <p className="mt-0.5 text-[10px] text-emerald-500">
                      Last catch: {formatDistanceToNow(new Date(intel.recentActivity.lastCatchTime), { addSuffix: true })}
                    </p>
                  )}
                </div>
              )}

              {/* Species-Bait Correlation */}
              {intel.speciesBaitCorrelation.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Target size={12} className="mr-1 inline" />
                    Best Baits by Species
                  </p>
                  <div className="mt-2 space-y-2">
                    {intel.speciesBaitCorrelation.map((item) => (
                      <div key={item.species} className="rounded-lg bg-background p-2">
                        <p className="text-xs font-semibold text-foreground">{item.species}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.topBaits.map((bait) => (
                            <span
                              key={bait.bait}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400"
                            >
                              {bait.bait}
                              <span className="text-blue-500">({bait.count})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Time-Species Correlation */}
              {intel.timeSpeciesCorrelation.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Clock size={12} className="mr-1 inline" />
                    Peak Times by Species
                  </p>
                  <div className="mt-2 space-y-2">
                    {intel.timeSpeciesCorrelation.slice(0, 3).map((item) => (
                      <div key={item.period} className="rounded-lg bg-background p-2">
                        <p className="text-xs font-semibold text-foreground">{item.period}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.topSpecies.map((species) => (
                            <span
                              key={species.species}
                              className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400"
                            >
                              {species.species}
                              <span className="text-purple-500">({species.count})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Biggest Catches - Show by water type if both exist */}
              {(intel.biggestSeaCatch || intel.biggestFreshwaterCatch) ? (
                <div className={`mt-4 grid gap-2 ${intel.biggestSeaCatch && intel.biggestFreshwaterCatch ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {intel.biggestSeaCatch && (
                    <button
                      type="button"
                      onClick={() => navigate(`/catches/${intel.biggestSeaCatch!.id}`)}
                      className="rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 p-3 text-left hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-900/50 dark:hover:to-yellow-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-amber-400" />
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                          Biggest Sea
                        </p>
                      </div>
                      <div className="mt-1">
                        <span className="text-lg font-bold text-amber-400">
                          {formatWeight(intel.biggestSeaCatch.weight, { precision: 1 })}
                        </span>
                        <p className="text-xs text-amber-500 truncate">{intel.biggestSeaCatch.species}</p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-amber-500">
                        {formatDistanceToNow(new Date(intel.biggestSeaCatch.date), { addSuffix: true })}
                      </p>
                    </button>
                  )}
                  {intel.biggestFreshwaterCatch && (
                    <button
                      type="button"
                      onClick={() => navigate(`/catches/${intel.biggestFreshwaterCatch!.id}`)}
                      className="rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 p-3 text-left hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-900/50 dark:hover:to-yellow-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-amber-400" />
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                          Biggest Freshwater
                        </p>
                      </div>
                      <div className="mt-1">
                        <span className="text-lg font-bold text-amber-400">
                          {formatWeight(intel.biggestFreshwaterCatch.weight, { precision: 1 })}
                        </span>
                        <p className="text-xs text-amber-500 truncate">{intel.biggestFreshwaterCatch.species}</p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-amber-500">
                        {formatDistanceToNow(new Date(intel.biggestFreshwaterCatch.date), { addSuffix: true })}
                      </p>
                    </button>
                  )}
                </div>
              ) : intel.biggestCatch && (
                <button
                  type="button"
                  onClick={() => navigate(`/catches/${intel.biggestCatch!.id}`)}
                  className="mt-4 w-full rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 p-3 text-left hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-900/50 dark:hover:to-yellow-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                      Biggest Catch
                    </p>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-amber-400">
                      {formatWeight(intel.biggestCatch.weight, { precision: 1 })}
                    </span>
                    <span className="text-sm text-amber-500">{intel.biggestCatch.species}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-amber-500">
                    {formatDistanceToNow(new Date(intel.biggestCatch.date), { addSuffix: true })}
                  </p>
                </button>
              )}

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Users size={12} />
                  <span>Data from {intel.uniqueAnglers} anglers</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Last {intel.periodDays} days · {intel.areaDescription}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
