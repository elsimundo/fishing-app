import { useMemo } from 'react'
import type { WeatherData } from '../../types/weather'
import { WEATHER_CODES } from '../../types/weather'
import {
  calculateFishingConditions,
  getWindDirection,
  getWindArrow,
} from '../../services/fishing-conditions'
import { Wind, Droplets, Eye, Gauge, Sunrise, Sunset, Waves, X, Activity } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface WeatherInfoCardProps {
  weatherData: WeatherData
  onClose?: () => void
}

export function WeatherInfoCard({ weatherData, onClose }: WeatherInfoCardProps) {
  const { current, daily, marine } = weatherData

  const fishingConditions = useMemo(
    () => calculateFishingConditions(weatherData),
    [weatherData]
  )

  const weatherInfo = WEATHER_CODES[current.weatherCode] || {
    description: 'Unknown',
    icon: '❓',
  }

  const ratingColors = {
    excellent: 'from-green-500 to-emerald-500',
    good: 'from-blue-500 to-cyan-500',
    fair: 'from-yellow-500 to-orange-500',
    poor: 'from-red-500 to-pink-500',
  }

  const ratingBgColors = {
    excellent: 'bg-green-50 border-green-200',
    good: 'bg-blue-50 border-blue-200',
    fair: 'bg-yellow-50 border-yellow-200',
    poor: 'bg-red-50 border-red-200',
  }

  return (
    <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
      {/* Header - Fishing Conditions Score */}
      <div
        className={`bg-gradient-to-r ${ratingColors[fishingConditions.rating]} p-5 text-white flex-shrink-0`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={20} />
              <h3 className="font-bold text-lg">Fishing Conditions</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{fishingConditions.score}</span>
              <span className="text-xl opacity-80">/100</span>
            </div>
            <p className="text-sm opacity-90 mt-1 capitalize">{fishingConditions.rating}</p>
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
        <p className="text-sm mt-3 bg-white/20 rounded-lg p-3">
          {fishingConditions.recommendation}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Current Weather */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                Current Weather
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl">{weatherInfo.icon}</span>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(current.temperature)}°C
                  </p>
                  <p className="text-sm text-gray-600">
                    Feels like {Math.round(current.apparentTemperature)}°C
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-900 font-semibold">{weatherInfo.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(current.time), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Weather Grid */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
                <Wind size={14} />
                <span className="font-semibold">WIND</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {Math.round(current.windSpeed)} km/h
              </p>
              <p className="text-xs text-gray-600">
                {getWindArrow(current.windDirection)} {getWindDirection(current.windDirection)} ·
                Gusts {Math.round(current.windGusts)}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
                <Gauge size={14} />
                <span className="font-semibold">PRESSURE</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{Math.round(current.pressure)} hPa</p>
              <p className="text-xs text-gray-600">
                {current.pressure >= 1013 ? '📈 High' : '📉 Low'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
                <Droplets size={14} />
                <span className="font-semibold">RAIN</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{current.precipitation} mm</p>
              <p className="text-xs text-gray-600">{current.cloudCover}% cloud cover</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
                <Eye size={14} />
                <span className="font-semibold">VISIBILITY</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {(current.visibility / 1000).toFixed(1)} km
              </p>
              <p className="text-xs text-gray-600">UV Index: {current.uvIndex}</p>
            </div>
          </div>
        </div>

        {/* Condition Factors */}
        <div
          className={`p-4 border-b border-gray-100 ${ratingBgColors[fishingConditions.rating]}`}
        >
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">
            Condition Breakdown
          </p>
          <div className="space-y-2.5">
            {Object.entries(fishingConditions.factors).map(([key, factor]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-semibold capitalize text-gray-900 w-20">
                    {key}
                  </span>
                  <span className="text-xs text-gray-600 truncate">{factor.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                      style={{ width: `${(factor.score / 30) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-6 text-right">
                    {factor.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marine Conditions */}
        {marine && marine.waveHeight > 0 && (
          <div className="p-4 border-b border-gray-100 bg-blue-50">
            <div className="flex items-center gap-2 mb-3">
              <Waves size={18} className="text-blue-600" />
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                Marine Conditions
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600">Wave Height</p>
                <p className="text-lg font-bold text-blue-900">{marine.waveHeight.toFixed(1)}m</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Swell Height</p>
                <p className="text-lg font-bold text-blue-900">{marine.swellHeight.toFixed(1)}m</p>
              </div>
            </div>
          </div>
        )}

        {/* Sun Times */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">
            Sun Times Today
          </p>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <Sunrise className="w-8 h-8 text-orange-500 mx-auto mb-1" />
              <p className="text-sm font-semibold text-gray-900">
                {format(new Date(daily.sunrise[0]), 'h:mm a')}
              </p>
              <p className="text-xs text-gray-600">Sunrise</p>
            </div>
            <div className="text-center">
              <Sunset className="w-8 h-8 text-purple-500 mx-auto mb-1" />
              <p className="text-sm font-semibold text-gray-900">
                {format(new Date(daily.sunset[0]), 'h:mm a')}
              </p>
              <p className="text-xs text-gray-600">Sunset</p>
            </div>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="p-4">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">
            7-Day Forecast
          </p>
          <div className="space-y-2">
            {daily.time.map((day, idx) => {
              const dayWeather = WEATHER_CODES[daily.weatherCode[idx]] || WEATHER_CODES[0]
              return (
                <div
                  key={day}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{dayWeather.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {format(new Date(day), 'EEE, MMM d')}
                      </p>
                      <p className="text-xs text-gray-600">{dayWeather.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {Math.round(daily.temperatureMax[idx])}° /{' '}
                      {Math.round(daily.temperatureMin[idx])}°
                    </p>
                    <p className="text-xs text-gray-600">
                      {Math.round(daily.windSpeedMax[idx])} km/h
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          Data from <span className="font-semibold text-blue-600">Open-Meteo</span> ·{' '}
          {formatDistanceToNow(new Date(weatherData.fetchedAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
