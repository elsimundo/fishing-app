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
      <div className="rounded-xl border border-gray-200 bg-white p-4">
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
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Loader2 size={20} className="animate-spin text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Loading Weather</p>
            <p className="text-xs text-gray-500">Fetching conditions...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !weatherData || !fishingConditions) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
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
    excellent: 'bg-green-50 border-green-200',
    good: 'bg-blue-50 border-blue-200',
    fair: 'bg-yellow-50 border-yellow-200',
    poor: 'bg-red-50 border-red-200',
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <span className="text-xl">{weatherInfo.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">Weather</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${ratingColors[fishingConditions.rating]}`}
              >
                {fishingConditions.score}/100
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {Math.round(current.temperature)}°C · {weatherInfo.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!expanded && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Wind</p>
              <p className="text-sm font-semibold text-gray-900">
                {Math.round(current.windSpeed)} km/h
              </p>
            </div>
          )}
          {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <div className={`mt-3 rounded-lg border p-3 ${ratingBgColors[fishingConditions.rating]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Fishing Conditions</p>
                <p className="mt-1 text-lg font-bold text-gray-900 capitalize">{fishingConditions.rating}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{fishingConditions.score}</p>
                <p className="text-xs text-gray-500">/100</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-700">{fishingConditions.recommendation}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Wind size={14} />
                <span className="font-semibold">WIND</span>
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900">{Math.round(current.windSpeed)} km/h</p>
              <p className="text-xs text-gray-600">
                {getWindArrow(current.windDirection)} {getWindDirection(current.windDirection)} · Gusts {Math.round(current.windGusts)}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Gauge size={14} />
                <span className="font-semibold">PRESSURE</span>
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900">{Math.round(current.pressure)} hPa</p>
              <p className="text-xs text-gray-600">{current.pressure >= 1013 ? '📈 High' : '📉 Low'}</p>
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Droplets size={14} />
                <span className="font-semibold">RAIN</span>
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900">{current.precipitation} mm</p>
              <p className="text-xs text-gray-600">{current.cloudCover}% clouds</p>
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Sunrise size={14} />
                <span className="font-semibold">SUN</span>
              </div>
              <p className="mt-1 text-sm font-bold text-gray-900">↑ {format(new Date(daily.sunrise[0]), 'h:mm a')}</p>
              <p className="text-xs text-gray-600">↓ {format(new Date(daily.sunset[0]), 'h:mm a')}</p>
            </div>
          </div>

          {/* Moon Phase */}
          {(() => {
            const moonData = getMoonPhase()
            const moonRatingColors = {
              excellent: 'bg-green-50 border-green-200 text-green-700',
              good: 'bg-blue-50 border-blue-200 text-blue-700',
              fair: 'bg-yellow-50 border-yellow-200 text-yellow-700',
              poor: 'bg-red-50 border-red-200 text-red-700',
            }
            return (
              <div className="mt-3 rounded-lg border bg-indigo-50 border-indigo-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon size={16} className="text-indigo-600" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Moon Phase</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${moonRatingColors[moonData.fishingRating]}`}>
                    {moonData.fishingRating}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-3xl">{moonData.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{moonData.phase}</p>
                    <p className="text-xs text-gray-600">{moonData.illumination}% illuminated</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-700">{moonData.fishingTip}</p>
              </div>
            )
          })()}

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">5-Day Forecast</p>
            <div className="mt-2 flex gap-1">
              {daily.time.slice(0, 5).map((day, idx) => {
                const dayWeather = WEATHER_CODES[daily.weatherCode[idx]] || WEATHER_CODES[0]
                return (
                  <div key={day} className="flex-1 rounded-lg bg-gray-50 p-2 text-center">
                    <p className="text-[10px] font-semibold text-gray-600">{format(new Date(day), 'EEE')}</p>
                    <span className="text-lg">{dayWeather.icon}</span>
                    <p className="text-xs font-bold text-gray-900">{Math.round(daily.temperatureMax[idx])}°</p>
                    <p className="text-[10px] text-gray-500">{Math.round(daily.temperatureMin[idx])}°</p>
                    <div className="mt-1 flex items-center justify-center gap-0.5">
                      <Wind size={10} className="text-gray-500" />
                      <p className="text-[10px] font-medium text-gray-600">{Math.round(daily.windSpeedMax[idx])}</p>
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
