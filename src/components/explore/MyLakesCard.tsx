import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Heart, Navigation, Loader2, MapPin } from 'lucide-react'
import { useSavedLakes } from '../../hooks/useSavedLakes'
import type { Lake } from '../../types'

interface MyLakesCardProps {
  onSelectLake?: (lake: Lake) => void
}

export function MyLakesCard({ onSelectLake }: MyLakesCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { savedLakes, isLoading, unsaveLake, isPending } = useSavedLakes()

  const hasLakes = savedLakes.length > 0

  return (
    <div className="rounded-xl border border-[#334155] bg-[#243B4A] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 hover:bg-[#1A2D3D] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-900/30 text-xl">
            ❤️
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">My Lakes</h3>
            <p className="text-xs text-gray-400">
              {hasLakes ? `${savedLakes.length} saved` : 'Save lakes to track'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#334155] px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : !hasLakes ? (
            <div className="rounded-lg bg-[#1A2D3D] p-4 text-center mt-3">
              <span className="text-3xl">🏞️</span>
              <p className="mt-2 text-sm font-medium text-gray-300">No saved lakes yet</p>
              <p className="mt-1 text-xs text-gray-500">
                Tap the ❤️ on any lake to add it to your watchlist
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {savedLakes.map((saved) => {
                const lake = saved.lake
                if (!lake) return null

                return (
                  <div
                    key={saved.id}
                    className="flex items-center justify-between rounded-lg bg-[#1A2D3D] p-3"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectLake?.(lake)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏞️</span>
                        <div>
                          <p className="text-sm font-medium text-white">{lake.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            {lake.is_verified && (
                              <span className="rounded bg-green-900/30 px-1 py-0.5 text-green-400">
                                Verified
                              </span>
                            )}
                            {lake.day_ticket_price && (
                              <span>£{lake.day_ticket_price}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1">
                      <Link
                        to={`/lakes/${lake.id}`}
                        className="rounded-lg p-2 text-gray-400 hover:bg-[#334155] hover:text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MapPin size={14} />
                      </Link>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lake.latitude},${lake.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 text-gray-400 hover:bg-[#334155] hover:text-white"
                      >
                        <Navigation size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          unsaveLake.mutate(lake.id)
                        }}
                        disabled={isPending}
                        className="rounded-lg p-2 text-pink-400 hover:bg-pink-900/30 hover:text-pink-300 disabled:opacity-50"
                      >
                        <Heart size={14} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
