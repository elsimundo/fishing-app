import { useState } from 'react'
import { Waves, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useTideData, useTideDataForDate } from '../../hooks/useTideData'
import { format, formatDistanceToNow, addDays, startOfDay, isSameDay } from 'date-fns'

interface TideCardProps {
  lat: number | null
  lng: number | null
}

export function TideCard({ lat, lng }: TideCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null) // null = today (live)
  const { data: tideData, isLoading, error } = useTideData(lat, lng, lat !== null && lng !== null)
  const { data: futureTideData, isLoading: futureLoading } = useTideDataForDate(
    lat,
    lng,
    selectedDate,
    3,
    selectedDate !== null
  )
  
  // Use future data if a date is selected, otherwise use live data
  const displayData = selectedDate ? futureTideData : tideData
  const isLoadingData = selectedDate ? futureLoading : isLoading

  if (!lat || !lng) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Waves size={20} />
          <span className="text-sm font-medium text-foreground">Tides</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Search a location to see tide data</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Loader2 size={20} className="animate-spin text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Loading Tides</p>
            <p className="text-xs text-muted-foreground">Fetching tide data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tideData) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Waves size={20} />
          <span className="text-sm font-medium text-foreground">Tides</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Tide data unavailable for this location</p>
      </div>
    )
  }

  const { current, extremes, station, gaugeData } = tideData
  const isLive = gaugeData?.latestReading !== undefined

  const formatHeight = (height: number) => `${height.toFixed(1)}m`

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Waves size={20} className="text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Tides</p>
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  LIVE
                </span>
              )}
            </div>
            {current ? (
              <p className="text-xs text-muted-foreground">
                {current.type === 'rising' ? '↗ Rising' : '↘ Falling'} · {formatHeight(current.height)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{station.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick preview of next tide */}
          {extremes?.nextHigh && !expanded && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Next High</p>
              <p className="text-sm font-semibold text-foreground">
                {format(new Date(extremes.nextHigh.time), 'h:mm a')}
              </p>
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
          {/* Horizontal scrollable date picker - shows next 10 days */}
          <div className="mt-3 -mx-4 px-4">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {/* Today button with live indicator */}
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className={`flex-shrink-0 flex flex-col items-center rounded-xl px-3 py-2 min-w-[56px] transition-all ${
                  !selectedDate
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-muted text-foreground hover:bg-muted/70'
                }`}
              >
                <span className="text-[10px] font-medium uppercase">
                  {!selectedDate && isLive ? '● Live' : 'Today'}
                </span>
                <span className="text-sm font-bold">{format(new Date(), 'd')}</span>
              </button>
              
              {/* Next 9 days */}
              {Array.from({ length: 9 }, (_, i) => {
                const date = addDays(startOfDay(new Date()), i + 1)
                const isSelected = selectedDate && isSameDay(selectedDate, date)
                const isWeekend = [0, 6].includes(date.getDay())
                
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 flex flex-col items-center rounded-xl px-3 py-2 min-w-[56px] transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : isWeekend
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                        : 'bg-muted text-foreground hover:bg-muted/70'
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase">{format(date, 'EEE')}</span>
                    <span className="text-sm font-bold">{format(date, 'd')}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Loading state */}
          {isLoadingData && selectedDate && (
            <div className="mt-3 flex items-center justify-center gap-2 py-8">
              <Loader2 size={20} className="animate-spin text-blue-500" />
              <span className="text-sm text-muted-foreground">Loading tides...</span>
            </div>
          )}

          {/* Content for selected date */}
          {!isLoadingData && (
            <>
              {/* Live Reading - compact, only for today */}
              {!selectedDate && isLive && gaugeData?.latestReading && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-500/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Live</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{formatHeight(gaugeData.latestReading.level)}</span>
                    <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">
                      {formatDistanceToNow(new Date(gaugeData.latestReading.time), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )}

              {/* Tide times - app style with 24hr format */}
              {(displayData?.predictions?.length ?? 0) > 0 ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {selectedDate ? format(selectedDate, 'EEEE, d MMM') : 'Tide Times'}
                    </p>
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(null)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        ← Back to live
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {(displayData?.predictions ?? []).slice(0, selectedDate ? 6 : 8).map((pred, idx) => {
                      const predDate = new Date(pred.time)
                      const today = new Date()
                      const isToday = format(predDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                      const isTomorrow = format(predDate, 'yyyy-MM-dd') === format(addDays(today, 1), 'yyyy-MM-dd')
                      const isHigh = pred.type === 'high'
                      
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                            isHigh ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-500/40' : 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-500/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                              isHigh ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                            }`}>
                              {isHigh ? 'H' : 'L'}
                            </div>
                            <div>
                              <p className="text-lg font-bold text-foreground">
                                {format(predDate, 'HH:mm')}
                              </p>
                              {!selectedDate && (
                                <p className="text-xs text-muted-foreground">
                                  {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(predDate, 'EEE')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${isHigh ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {formatHeight(pred.height)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {isHigh ? 'High' : 'Low'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-muted p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedDate 
                      ? `No tide data for ${format(selectedDate, 'EEE, MMM d')}`
                      : 'Tide predictions unavailable'
                    }
                  </p>
                </div>
              )}

              {/* Station Info - more compact */}
              <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>📍 {station.name}</span>
                <span>{station.distance ? `${station.distance.toFixed(1)}km` : ''} · {station.source === 'uk-ea' ? 'UK EA' : station.source === 'noaa' ? 'NOAA' : 'WorldTides'}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
