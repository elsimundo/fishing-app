import { useState } from 'react'
import { Waves, ChevronDown, ChevronUp, Clock, Loader2 } from 'lucide-react'
import { useTideData } from '../../hooks/useTideData'
import { format, formatDistanceToNow } from 'date-fns'

interface TideCardProps {
  lat: number | null
  lng: number | null
}

export function TideCard({ lat, lng }: TideCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { data: tideData, isLoading, error } = useTideData(lat, lng, lat !== null && lng !== null)

  if (!lat || !lng) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <Waves size={20} />
          <span className="text-sm font-medium">Tides</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">Search a location to see tide data</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Loader2 size={20} className="animate-spin text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Loading Tides</p>
            <p className="text-xs text-gray-500">Fetching tide data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tideData) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <Waves size={20} />
          <span className="text-sm font-medium">Tides</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">Tide data unavailable for this location</p>
      </div>
    )
  }

  const { current, extremes, predictions, station, gaugeData } = tideData
  const isLive = gaugeData?.latestReading !== undefined

  const formatHeight = (height: number) => `${height.toFixed(1)}m`

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Waves size={20} className="text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">Tides</p>
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  LIVE
                </span>
              )}
            </div>
            {current ? (
              <p className="text-xs text-gray-600">
                {current.type === 'rising' ? '↗ Rising' : '↘ Falling'} · {formatHeight(current.height)}
              </p>
            ) : (
              <p className="text-xs text-gray-500">{station.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick preview of next tide */}
          {extremes?.nextHigh && !expanded && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Next High</p>
              <p className="text-sm font-semibold text-gray-900">
                {format(new Date(extremes.nextHigh.time), 'h:mm a')}
              </p>
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
          {/* Live Reading */}
          {isLive && gaugeData?.latestReading && (
            <div className="mt-3 rounded-lg bg-green-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Live Reading
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-900">
                  {formatHeight(gaugeData.latestReading.level)}
                </span>
                <span className="text-xs text-green-700">
                  {formatDistanceToNow(new Date(gaugeData.latestReading.time), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}

          {/* Next High/Low */}
          {extremes && (extremes.nextHigh || extremes.nextLow) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {extremes.nextHigh && (
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-700">Next High</p>
                  <p className="mt-1 text-lg font-bold text-emerald-900">
                    {formatHeight(extremes.nextHigh.height)}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <Clock size={12} />
                    <span>{format(new Date(extremes.nextHigh.time), 'h:mm a')}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {formatDistanceToNow(new Date(extremes.nextHigh.time), { addSuffix: true })}
                  </p>
                </div>
              )}
              {extremes.nextLow && (
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-700">Next Low</p>
                  <p className="mt-1 text-lg font-bold text-amber-900">
                    {formatHeight(extremes.nextLow.height)}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <Clock size={12} />
                    <span>{format(new Date(extremes.nextLow.time), 'h:mm a')}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {formatDistanceToNow(new Date(extremes.nextLow.time), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upcoming Tides */}
          {predictions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Upcoming Tides
              </p>
              <div className="mt-2 space-y-1.5">
                {predictions.slice(0, 6).map((pred, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{pred.type === 'high' ? '⬆️' : '⬇️'}</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          {pred.type === 'high' ? 'High' : 'Low'} Tide
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {format(new Date(pred.time), 'EEE, MMM d · h:mm a')}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatHeight(pred.height)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500">
            <span>📍 {station.name}</span>
            <span className="capitalize">{station.source}</span>
          </div>
        </div>
      )}
    </div>
  )
}
