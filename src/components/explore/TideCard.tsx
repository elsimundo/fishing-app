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

  const { current, extremes, station, gaugeData } = tideData
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
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              <span className="text-sm text-gray-500">Loading tides...</span>
            </div>
          )}

          {/* Content for selected date */}
          {!isLoadingData && (
            <>
              {/* Live Reading - compact, only for today */}
              {!selectedDate && isLive && gaugeData?.latestReading && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-700">Live</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-800">{formatHeight(gaugeData.latestReading.level)}</span>
                    <span className="ml-1 text-xs text-green-600">
                      {formatDistanceToNow(new Date(gaugeData.latestReading.time), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )}

              {/* Tide times - app style with 24hr format */}
              {(displayData?.predictions?.length ?? 0) > 0 ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                            isHigh ? 'bg-emerald-50' : 'bg-amber-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                              isHigh ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isHigh ? 'H' : 'L'}
                            </div>
                            <div>
                              <p className="text-lg font-bold text-gray-900">
                                {format(predDate, 'HH:mm')}
                              </p>
                              {!selectedDate && (
                                <p className="text-xs text-gray-500">
                                  {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(predDate, 'EEE')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${isHigh ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {formatHeight(pred.height)}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {isHigh ? 'High' : 'Low'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-gray-50 p-4 text-center">
                  <p className="text-sm text-gray-500">
                    {selectedDate 
                      ? `No tide data for ${format(selectedDate, 'EEE, MMM d')}`
                      : 'Tide predictions unavailable'
                    }
                  </p>
                </div>
              )}

              {/* Station Info - more compact */}
              <div className="mt-4 flex items-center justify-between text-[10px] text-gray-400">
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
