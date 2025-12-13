import type { TideData } from '../../types/tides'
import { Waves, TrendingUp, TrendingDown, Clock, MapPin, X, Activity } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface TideInfoCardProps {
  tideData: TideData
  onClose?: () => void
}

export function TideInfoCard({ tideData, onClose }: TideInfoCardProps) {
  const { station, current, extremes, predictions } = tideData

  const formatHeight = (meters: number) => `${meters.toFixed(2)}m`

  return (
    <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
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
        {/* Real-Time Reading (UK-EA only) */}
        {tideData.gaugeData?.latestReading && (
          <div className="p-4 border-b border-border bg-emerald-50 dark:bg-emerald-900/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                <Activity size={16} className="text-emerald-400" />
              </div>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">
                Live Reading
              </p>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">
                  {formatHeight(tideData.gaugeData.latestReading.level)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Measured {formatDistanceToNow(new Date(tideData.gaugeData.latestReading.time), { addSuffix: true })}
                </p>
              </div>
              {current && (
                <div className="flex items-center gap-1.5">
                  {current.type === 'rising' ? (
                    <>
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                        <TrendingUp size={20} className="text-emerald-400" />
                      </div>
                      <span className="text-sm font-semibold text-emerald-400">Rising</span>
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                        <TrendingDown size={20} className="text-orange-400" />
                      </div>
                      <span className="text-sm font-semibold text-orange-400">Falling</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Tide (for non-gauge data) */}
        {current && !tideData.gaugeData?.latestReading && (
          <div className="p-4 border-b border-border bg-blue-50 dark:bg-blue-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                  Current Tide
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-300 mt-1">
                  {formatHeight(current.height)}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  {current.type === 'rising' ? (
                    <>
                      <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                        <TrendingUp size={16} className="text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-emerald-400">Rising</span>
                    </>
                  ) : (
                    <>
                      <div className="p-1 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                        <TrendingDown size={16} className="text-orange-400" />
                      </div>
                      <span className="text-sm font-medium text-orange-400">Falling</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                  Next Tide
                </p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {current.nextTide.type === 'high' ? '⬆️ High' : '⬇️ Low'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(current.nextTide.time), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next High/Low */}
        {extremes && (extremes.nextHigh || extremes.nextLow) && (
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-2 gap-3">
              {extremes.nextHigh && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-500/40 rounded-xl p-3">
                  <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide mb-2">
                    Next High
                  </p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-300">
                    {formatHeight(extremes.nextHigh.height)}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                    <Clock size={14} />
                    <span>{format(new Date(extremes.nextHigh.time), 'h:mm a')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(extremes.nextHigh.time), { addSuffix: true })}
                  </p>
                </div>
              )}
              {extremes.nextLow && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-500/40 rounded-xl p-3">
                  <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide mb-2">
                    Next Low
                  </p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-300">
                    {formatHeight(extremes.nextLow.height)}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                    <Clock size={14} />
                    <span>{format(new Date(extremes.nextLow.time), 'h:mm a')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
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
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">
              Upcoming Tides (48h)
            </p>
            <div className="space-y-2">
              {predictions.slice(0, 8).map((pred, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2.5 px-3 bg-background rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {pred.type === 'high' ? '⬆️' : '⬇️'}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {pred.type === 'high' ? 'High' : 'Low'} Tide
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(pred.time), 'EEE, MMM d · h:mm a')}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-foreground">{formatHeight(pred.height)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-background border-t border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Data from{' '}
            {station.source === 'uk-ea' ? (
              <span className="font-semibold text-emerald-400">UK Environment Agency</span>
            ) : station.source === 'noaa' ? (
              <span className="font-semibold text-blue-400">NOAA</span>
            ) : (
              <span className="font-semibold text-purple-400">WorldTides</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(tideData.fetchedAt), { addSuffix: true })}
          </p>
        </div>
        {station.source === 'uk-ea' && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-xs text-emerald-400 font-semibold">Live tide gauge data</p>
          </div>
        )}
      </div>
    </div>
  )
}
