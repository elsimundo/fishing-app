import { useState } from 'react'
import { Waves, Loader2 } from 'lucide-react'
import { useTideData } from '../../hooks/useTideData'
import { TideInfoCard } from './TideInfoCard'

interface TideButtonProps {
  lat: number | null
  lng: number | null
  className?: string
}

export function TideButton({ lat, lng, className = '' }: TideButtonProps) {
  const [showTideInfo, setShowTideInfo] = useState(false)
  const { data: tideData, isLoading, error, refetch } = useTideData(lat, lng, showTideInfo)

  const handleClick = () => {
    setShowTideInfo(true)
    if (!tideData && !isLoading) {
      refetch()
    }
  }

  const handleClose = () => {
    setShowTideInfo(false)
  }

  if (!lat || !lng) return null

  return (
    <>
      {/* Tide Button */}
      <button
        onClick={handleClick}
        className={`px-4 py-2.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 font-semibold ${className}`}
        title="View tide information"
      >
        <Waves size={18} />
        <span>Tides</span>
      </button>

      {/* Tide Info Modal */}
      {showTideInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50"
          onClick={handleClose}
        >
          <div
            className="w-full md:max-w-md animate-slide-up md:animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="bg-white rounded-t-2xl md:rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
                <p className="font-semibold text-gray-900 mb-1">Loading Tide Data</p>
                <p className="text-sm text-gray-600">Finding nearest tide station...</p>
              </div>
            ) : error || !tideData ? (
              <div className="bg-white rounded-t-2xl md:rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Waves className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-900 mb-2">No Tide Data Available</p>
                <p className="text-sm text-gray-600 mb-6">
                  Tide information is not available for this location. Try searching near a coastal area.
                </p>
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <TideInfoCard tideData={tideData} onClose={handleClose} />
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
