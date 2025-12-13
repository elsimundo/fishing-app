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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-900/30 text-xl">
            ❤️
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">My Lakes</h3>
            <p className="text-xs text-muted-foreground">
              {hasLakes ? `${savedLakes.length} saved` : 'Save lakes to track'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={18} className="text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : !hasLakes ? (
            <div className="rounded-lg bg-background p-4 text-center mt-3">
              <span className="text-3xl">🏞️</span>
              <p className="mt-2 text-sm font-medium text-muted-foreground">No saved lakes yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
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
                    className="flex items-center justify-between rounded-lg bg-background p-3"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectLake?.(lake)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏞️</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{lake.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {lake.is_verified && (
                              <span className="rounded bg-green-100 dark:bg-green-900/30 px-1 py-0.5 text-green-600 dark:text-green-400">
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
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MapPin size={14} />
                      </Link>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lake.latitude},${lake.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        className="rounded-lg p-2 text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/30 hover:text-pink-300 disabled:opacity-50"
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
