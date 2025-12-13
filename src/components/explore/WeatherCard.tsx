import { useState, useMemo } from 'react'
import { CloudSun, ChevronDown, ChevronUp, Wind, Gauge, Droplets, Loader2, Sunrise, Moon } from 'lucide-react'
import { useWeatherData } from '../../hooks/useWeatherData'
import { WEATHER_CODES } from '../../types/weather'
import { calculateFishingConditions, getWindDirection, getWindArrow } from '../../services/fishing-conditions'
import { getMoonPhase } from '../../utils/moonPhase'
import { format } from 'date-fns'

interface WeatherCardProps {
  lat: number | null
  lng: number | null
}

export function WeatherCard({ lat, lng }: WeatherCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { data: weatherData, isLoading, error } = useWeatherData(lat, lng, lat !== null && lng !== null)

  const fishingConditions = useMemo(() => {
    if (!weatherData) return null
    return calculateFishingConditions(weatherData)
  }, [weatherData])

  if (!lat || !lng) {
    return (
      <div className="rounded-xl border border-[#334155] bg-[#243B4A] p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <CloudSun size={20} />
          <span className="text-sm font-medium">Weather</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">Search a location to see weather data</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#334155] bg-[#243B4A] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-900/30">
            <Loader2 size={20} className="animate-spin text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Loading Weather</p>
            <p className="text-xs text-gray-400">Fetching conditions...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !weatherData || !fishingConditions) {
    return (
      <div className="rounded-xl border border-[#334155] bg-[#243B4A] p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <CloudSun size={20} />
          <span className="text-sm font-medium">Weather</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">Weather data unavailable for this location</p>
      </div>
    )
  }

  const { current, daily } = weatherData
  const weatherInfo = WEATHER_CODES[current.weatherCode] || { description: 'Unknown', icon: '❓' }

  const ratingColors = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
  }

  const ratingBgColors = {
    excellent: 'bg-green-900/30 border-green-500/40',
    good: 'bg-blue-900/30 border-blue-500/40',
    fair: 'bg-yellow-900/30 border-yellow-500/40',
    poor: 'bg-red-900/30 border-red-500/40',
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#243B4A]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[#1A2D3D]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-900/30">
            <span className="text-xl">{weatherInfo.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Weather</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${ratingColors[fishingConditions.rating]}`}
              >
                {fishingConditions.score}/100
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {Math.round(current.temperature)}°C · {weatherInfo.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!expanded && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Wind</p>
              <p className="text-sm font-semibold text-white">
                {Math.round(current.windSpeed)} km/h
              </p>
            </div>
          )}
          {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#334155] px-4 pb-4">
          <div className={`mt-3 rounded-lg border p-3 ${ratingBgColors[fishingConditions.rating]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fishing Conditions</p>
                <p className="mt-1 text-lg font-bold text-white capitalize">{fishingConditions.rating}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{fishingConditions.score}</p>
                <p className="text-xs text-gray-500">/100</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-300">{fishingConditions.recommendation}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#1A2D3D] p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Wind size={14} />
                <span className="font-semibold">WIND</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white">{Math.round(current.windSpeed)} km/h</p>
              <p className="text-xs text-gray-400">
                {getWindArrow(current.windDirection)} {getWindDirection(current.windDirection)} · Gusts {Math.round(current.windGusts)}
              </p>
            </div>

            <div className="rounded-lg bg-[#1A2D3D] p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Gauge size={14} />
                <span className="font-semibold">PRESSURE</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white">{Math.round(current.pressure)} hPa</p>
              <p className="text-xs text-gray-400">{current.pressure >= 1013 ? '📈 High' : '📉 Low'}</p>
            </div>

            <div className="rounded-lg bg-[#1A2D3D] p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Droplets size={14} />
                <span className="font-semibold">RAIN</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white">{current.precipitation} mm</p>
              <p className="text-xs text-gray-400">{current.cloudCover}% clouds</p>
            </div>

            <div className="rounded-lg bg-[#1A2D3D] p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Sunrise size={14} />
                <span className="font-semibold">SUN</span>
              </div>
              <p className="mt-1 text-sm font-bold text-white">↑ {format(new Date(daily.sunrise[0]), 'h:mm a')}</p>
              <p className="text-xs text-gray-400">↓ {format(new Date(daily.sunset[0]), 'h:mm a')}</p>
            </div>
          </div>

          {/* Moon Phase */}
          {(() => {
            const moonData = getMoonPhase()
            const moonRatingColors = {
              excellent: 'bg-green-900/30 border-green-500/40 text-green-400',
              good: 'bg-blue-900/30 border-blue-500/40 text-blue-400',
              fair: 'bg-yellow-900/30 border-yellow-500/40 text-yellow-400',
              poor: 'bg-red-900/30 border-red-500/40 text-red-400',
            }
            return (
              <div className="mt-3 rounded-lg border bg-indigo-900/30 border-indigo-500/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon size={16} className="text-indigo-400" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-400">Moon Phase</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${moonRatingColors[moonData.fishingRating]}`}>
                    {moonData.fishingRating}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-3xl">{moonData.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{moonData.phase}</p>
                    <p className="text-xs text-gray-400">{moonData.illumination}% illuminated</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">{moonData.fishingTip}</p>
              </div>
            )
          })()}

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">5-Day Forecast</p>
            <div className="mt-2 flex gap-1">
              {daily.time.slice(0, 5).map((day, idx) => {
                const dayWeather = WEATHER_CODES[daily.weatherCode[idx]] || WEATHER_CODES[0]
                return (
                  <div key={day} className="flex-1 rounded-lg bg-[#1A2D3D] p-2 text-center">
                    <p className="text-[10px] font-semibold text-gray-400">{format(new Date(day), 'EEE')}</p>
                    <span className="text-lg">{dayWeather.icon}</span>
                    <p className="text-xs font-bold text-white">{Math.round(daily.temperatureMax[idx])}°</p>
                    <p className="text-[10px] text-gray-500">{Math.round(daily.temperatureMin[idx])}°</p>
                    <div className="mt-1 flex items-center justify-center gap-0.5">
                      <Wind size={10} className="text-gray-500" />
                      <p className="text-[10px] font-medium text-gray-400">{Math.round(daily.windSpeedMax[idx])}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="mt-3 text-center text-[10px] text-gray-500">
            Data from Open-Meteo · Free & unlimited
          </p>
        </div>
      )}
    </div>
  )
}
