import type { TideData } from '../../types/tides'
import { Waves, TrendingUp, TrendingDown, Clock, MapPin, X } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface TideInfoCardProps {
  tideData: TideData
  onClose?: () => void
}

export function TideInfoCard({ tideData, onClose }: TideInfoCardProps) {
  const { station, current, extremes, predictions } = tideData

  const formatHeight = (meters: number) => `${meters.toFixed(2)}m`

  return (
    <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 text-white flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-white/20 rounded-xl">
              <Waves size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Tide Information</h3>
              <div className="flex items-center gap-1 text-sm opacity-90 mt-0.5">
                <MapPin size={14} />
                <span className="truncate max-w-[200px]">{station.name}</span>
                {station.distance !== undefined && (
                  <span className="whitespace-nowrap">({station.distance.toFixed(1)}km)</span>
                )}
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Current Tide */}
        {current && (
          <div className="p-4 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                  Current Tide
                </p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {formatHeight(current.height)}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  {current.type === 'rising' ? (
                    <>
                      <div className="p-1 bg-green-100 rounded-full">
                        <TrendingUp size={16} className="text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-green-700">Rising</span>
                    </>
                  ) : (
                    <>
                      <div className="p-1 bg-orange-100 rounded-full">
                        <TrendingDown size={16} className="text-orange-600" />
                      </div>
                      <span className="text-sm font-medium text-orange-700">Falling</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                  Next Tide
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {current.nextTide.type === 'high' ? '⬆️ High' : '⬇️ Low'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDistanceToNow(new Date(current.nextTide.time), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next High/Low */}
        {extremes && (extremes.nextHigh || extremes.nextLow) && (
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              {extremes.nextHigh && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide mb-2">
                    Next High
                  </p>
                  <p className="text-xl font-bold text-emerald-900">
                    {formatHeight(extremes.nextHigh.height)}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-700 mt-2">
                    <Clock size={14} />
                    <span>{format(new Date(extremes.nextHigh.time), 'h:mm a')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(extremes.nextHigh.time), { addSuffix: true })}
                  </p>
                </div>
              )}
              {extremes.nextLow && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-2">
                    Next Low
                  </p>
                  <p className="text-xl font-bold text-amber-900">
                    {formatHeight(extremes.nextLow.height)}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-700 mt-2">
                    <Clock size={14} />
                    <span>{format(new Date(extremes.nextLow.time), 'h:mm a')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(extremes.nextLow.time), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Tides */}
        {predictions.length > 0 && (
          <div className="p-4">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">
              Upcoming Tides (48h)
            </p>
            <div className="space-y-2">
              {predictions.slice(0, 8).map((pred, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {pred.type === 'high' ? '⬆️' : '⬇️'}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        {pred.type === 'high' ? 'High' : 'Low'} Tide
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(pred.time), 'EEE, MMM d · h:mm a')}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">{formatHeight(pred.height)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          Data from {station.source === 'noaa' ? 'NOAA Tides & Currents' : 'WorldTides'} ·{' '}
          Updated {formatDistanceToNow(new Date(tideData.fetchedAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
