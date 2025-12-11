import { useState } from 'react'
import { Fish, ChevronDown, ChevronUp, Loader2, Trophy, Clock, Users, Activity, Target } from 'lucide-react'
import { useLocalIntel } from '../../hooks/useLocalIntel'
import { formatDistanceToNow } from 'date-fns'
import type { FishingPreference } from '../../types'

interface LocalIntelCardProps {
  lat: number | null
  lng: number | null
  bounds?: { north: number; south: number; east: number; west: number } | null
  waterPreference?: FishingPreference | null
}

export function LocalIntelCard({ lat, lng, bounds, waterPreference }: LocalIntelCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { data: intel, isLoading, error } = useLocalIntel(lat, lng, bounds, 30, lat !== null && lng !== null, waterPreference)

  if (!lat || !lng) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <Fish size={20} />
          <span className="text-sm font-medium">Local Intel</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">Search a location to see fishing intel</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Loader2 size={20} className="animate-spin text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Loading Intel</p>
            <p className="text-xs text-gray-500">Analysing local catch data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !intel) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <Fish size={20} />
          <span className="text-sm font-medium">Local Intel</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">Unable to load fishing intel</p>
      </div>
    )
  }

  const hasData = intel.totalCatches > 0

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Fish size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Local Intel</p>
            {hasData ? (
              <p className="text-xs text-gray-600">
                {intel.totalCatches} catches · {intel.uniqueAnglers} anglers
              </p>
            ) : (
              <p className="text-xs text-gray-500">No catches logged nearby yet</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">Zones are ~1km hotspots. Exact marks stay private.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick preview */}
          {hasData && intel.topSpecies[0] && !expanded && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Top Species</p>
              <p className="text-sm font-semibold text-gray-900">{intel.topSpecies[0].species}</p>
            </div>
          )}
          {expanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {!hasData ? (
            <div className="mt-3 rounded-lg bg-gray-50 p-4 text-center">
              <Fish size={32} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-600">No catches logged nearby</p>
              <p className="mt-1 text-xs text-gray-500">
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
                  <div className="mt-3 rounded-lg bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-700">
                      In the last {intel.periodDays} days,
                      {bestPeriod && (
                        <>
                          {' '}this zone has fished best in <span className="font-semibold">{bestPeriod.toLowerCase()}</span>
                        </>
                      )}
                      {topSpecies && (
                        <>
                          {' '}for <span className="font-semibold">{topSpecies}</span>
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
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-900">{intel.totalCatches}</p>
                  <p className="text-[10px] text-emerald-700">Catches</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-lg font-bold text-blue-900">{intel.uniqueAnglers}</p>
                  <p className="text-[10px] text-blue-700">Anglers</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-lg font-bold text-amber-900">{intel.topSpecies.length}</p>
                  <p className="text-[10px] text-amber-700">Species</p>
                </div>
              </div>

              {/* Top Species */}
              {intel.topSpecies.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    🐟 Top Species
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {intel.topSpecies.map((s, idx) => (
                      <div
                        key={s.species}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                          <span className="text-sm font-medium text-gray-900">{s.species}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-emerald-700">{s.count}</span>
                          {s.avgWeight && (
                            <span className="ml-2 text-xs text-gray-500">
                              avg {s.avgWeight.toFixed(1)}kg
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    🪱 Popular Baits
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {intel.topBaits.map((b) => (
                      <span
                        key={b.bait}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                      >
                        {b.bait}
                        <span className="text-amber-600">({b.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Times */}
              {intel.catchesByTimeOfDay.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <Clock size={12} className="mr-1 inline" />
                    Best Times
                  </p>
                  <div className="mt-2 space-y-1">
                    {intel.catchesByTimeOfDay.slice(0, 3).map((t) => (
                      <div key={t.period} className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${t.percentage}%` }}
                          />
                        </div>
                        <span className="w-20 text-xs text-gray-700">{t.period}</span>
                        <span className="w-10 text-right text-xs font-medium text-gray-900">
                          {t.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {intel.recentActivity.catchesLast24h > 0 && (
                <div className="mt-4 rounded-lg bg-emerald-50 p-3">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-emerald-600" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Recent Activity
                    </p>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-emerald-900">
                      {intel.recentActivity.catchesLast24h}
                    </span>
                    <span className="text-sm text-emerald-800">catches in last 24hrs</span>
                  </div>
                  {intel.recentActivity.lastCatchTime && (
                    <p className="mt-0.5 text-[10px] text-emerald-600">
                      Last catch: {formatDistanceToNow(new Date(intel.recentActivity.lastCatchTime), { addSuffix: true })}
                    </p>
                  )}
                </div>
              )}

              {/* Species-Bait Correlation */}
              {intel.speciesBaitCorrelation.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <Target size={12} className="mr-1 inline" />
                    Best Baits by Species
                  </p>
                  <div className="mt-2 space-y-2">
                    {intel.speciesBaitCorrelation.map((item) => (
                      <div key={item.species} className="rounded-lg bg-gray-50 p-2">
                        <p className="text-xs font-semibold text-gray-900">{item.species}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.topBaits.map((bait) => (
                            <span
                              key={bait.bait}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800"
                            >
                              {bait.bait}
                              <span className="text-blue-600">({bait.count})</span>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <Clock size={12} className="mr-1 inline" />
                    Peak Times by Species
                  </p>
                  <div className="mt-2 space-y-2">
                    {intel.timeSpeciesCorrelation.slice(0, 3).map((item) => (
                      <div key={item.period} className="rounded-lg bg-gray-50 p-2">
                        <p className="text-xs font-semibold text-gray-900">{item.period}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.topSpecies.map((species) => (
                            <span
                              key={species.species}
                              className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-800"
                            >
                              {species.species}
                              <span className="text-purple-600">({species.count})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Biggest Catch */}
              {intel.biggestCatch && (
                <div className="mt-4 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 p-3">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-amber-600" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Biggest Catch
                    </p>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-amber-900">
                      {intel.biggestCatch.weight.toFixed(2)}kg
                    </span>
                    <span className="text-sm text-amber-800">{intel.biggestCatch.species}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-amber-600">
                    {formatDistanceToNow(new Date(intel.biggestCatch.date), { addSuffix: true })}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Users size={12} />
                  <span>Data from {intel.uniqueAnglers} anglers</span>
                </div>
                <span className="text-[10px] text-gray-500">
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
