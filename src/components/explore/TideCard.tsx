import { useState } from 'react'
import { Waves, ChevronDown, ChevronUp, Loader2, Calendar } from 'lucide-react'
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
          {/* Date Picker - Quick date navigation */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                !selectedDate
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            {[1, 2, 7, 14].map((daysAhead) => {
              const date = addDays(startOfDay(new Date()), daysAhead)
              const isSelected = selectedDate && isSameDay(selectedDate, date)
              const label = daysAhead === 1 ? 'Tomorrow' : daysAhead === 7 ? 'Next Week' : daysAhead === 14 ? '2 Weeks' : format(date, 'EEE')
              
              return (
                <button
                  key={daysAhead}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Custom date picker */}
          <div className="mt-2 flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
              min={format(new Date(), 'yyyy-MM-dd')}
              max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(new Date(e.target.value))
                } else {
                  setSelectedDate(null)
                }
              }}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="rounded-lg bg-gray-100 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-200"
              >
                Back to Live
              </button>
            )}
          </div>

          {/* Loading state for future data */}
          {isLoadingData && selectedDate && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-4">
              <Loader2 size={16} className="animate-spin text-gray-400" />
              <span className="text-xs text-gray-500">Loading tides for {format(selectedDate, 'EEE, MMM d')}...</span>
            </div>
          )}

          {/* Live Reading - only show when viewing today */}
          {!selectedDate && isLive && gaugeData?.latestReading && (
            <div className="mt-3 rounded-lg bg-green-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Live Reading
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-sm text-green-700">
                  {formatHeight(gaugeData.latestReading.level)}
                </span>
                <span className="text-xs text-green-600">
                  {formatDistanceToNow(new Date(gaugeData.latestReading.time), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}

          {/* Next High/Low - TIME is now prominent, depth secondary */}
          {(displayData?.extremes?.nextHigh || displayData?.extremes?.nextLow) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {displayData?.extremes?.nextHigh && (
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-700">
                    {selectedDate ? 'First High' : 'Next High'}
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-900">
                    {format(new Date(displayData.extremes.nextHigh.time), 'h:mm a')}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <span className="text-emerald-600 font-medium">
                      {formatHeight(displayData.extremes.nextHigh.height)}
                    </span>
                  </div>
                  {!selectedDate && (
                    <p className="text-[10px] text-gray-500">
                      {formatDistanceToNow(new Date(displayData.extremes.nextHigh.time), { addSuffix: true })}
                    </p>
                  )}
                </div>
              )}
              {displayData?.extremes?.nextLow && (
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-700">
                    {selectedDate ? 'First Low' : 'Next Low'}
                  </p>
                  <p className="mt-1 text-xl font-bold text-amber-900">
                    {format(new Date(displayData.extremes.nextLow.time), 'h:mm a')}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <span className="text-amber-600 font-medium">
                      {formatHeight(displayData.extremes.nextLow.height)}
                    </span>
                  </div>
                  {!selectedDate && (
                    <p className="text-[10px] text-gray-500">
                      {formatDistanceToNow(new Date(displayData.extremes.nextLow.time), { addSuffix: true })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Tides - TIME prominent, depth secondary */}
          {(displayData?.predictions?.length ?? 0) > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                {selectedDate ? `Tides for ${format(selectedDate, 'EEE, MMM d')}` : 'Tide Times'}
              </p>
              <div className="mt-2 space-y-1.5">
                {(displayData?.predictions ?? []).slice(0, 10).map((pred, idx) => {
                  const predDate = new Date(pred.time)
                  const today = new Date()
                  const isToday = format(predDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                  const isTomorrow = format(predDate, 'yyyy-MM-dd') === format(addDays(today, 1), 'yyyy-MM-dd')
                  
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                        isToday ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{pred.type === 'high' ? '⬆️' : '⬇️'}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {format(predDate, 'h:mm a')}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {pred.type === 'high' ? 'High' : 'Low'} · {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(predDate, 'EEE, MMM d')}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-600">{formatHeight(pred.height)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : !isLoadingData && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">
                {selectedDate 
                  ? `No tide data available for ${format(selectedDate, 'EEE, MMM d')}`
                  : 'Future tide times unavailable. Only live readings shown.'
                }
              </p>
            </div>
          )}

          {/* Station Info */}
          <div className="mt-3 rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Reference Station
            </p>
            <p className="mt-1 text-xs font-medium text-gray-900">📍 {station.name}</p>
            <p className="mt-0.5 text-[10px] text-gray-500">
              {station.distance ? `${station.distance.toFixed(1)} km away` : 'Nearest station'} · {station.source === 'uk-ea' ? 'UK Environment Agency' : station.source === 'noaa' ? 'NOAA' : 'WorldTides'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
