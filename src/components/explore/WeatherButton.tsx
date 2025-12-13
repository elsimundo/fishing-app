import { useState } from 'react'
import { CloudSun, Loader2 } from 'lucide-react'
import { useWeatherData } from '../../hooks/useWeatherData'
import { WeatherInfoCard } from './WeatherInfoCard'

interface WeatherButtonProps {
  lat: number | null
  lng: number | null
  className?: string
}

export function WeatherButton({ lat, lng, className = '' }: WeatherButtonProps) {
  const [showWeatherInfo, setShowWeatherInfo] = useState(false)
  const { data: weatherData, isLoading, error, refetch } = useWeatherData(lat, lng, showWeatherInfo)

  const handleClick = () => {
    setShowWeatherInfo(true)
    if (!weatherData && !isLoading) {
      refetch()
    }
  }

  const handleClose = () => {
    setShowWeatherInfo(false)
  }

  if (!lat || !lng) return null

  return (
    <>
      {/* Weather Button */}
      <button
        onClick={handleClick}
        className={`px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg hover:from-amber-600 hover:to-orange-600 active:scale-95 transition-all flex items-center gap-2 font-semibold ${className}`}
        title="View weather & fishing conditions"
      >
        <CloudSun size={18} />
        <span>Weather</span>
      </button>

      {/* Weather Info Modal */}
      {showWeatherInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50"
          onClick={handleClose}
        >
          <div
            className="w-full md:max-w-lg animate-slide-up md:animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                </div>
                <p className="font-semibold text-foreground mb-1">Loading Weather</p>
                <p className="text-sm text-muted-foreground">Fetching conditions...</p>
              </div>
            ) : error || !weatherData ? (
              <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
                  <CloudSun className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground mb-2">Weather Unavailable</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Unable to load weather data for this location.
                </p>
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-background text-muted-foreground rounded-xl font-semibold hover:bg-muted transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <WeatherInfoCard weatherData={weatherData} onClose={handleClose} />
            )}
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
