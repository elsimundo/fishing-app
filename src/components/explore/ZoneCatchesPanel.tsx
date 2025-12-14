import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Fish, Loader2, MapPin, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { useWeightFormatter } from '../../hooks/useWeightFormatter'

interface ZoneCatch {
  id: string
  species: string
  photo_url: string | null
  caught_at: string
  weight_kg: number | null
  length_cm: number | null
  user_id: string
  profiles?: {
    username: string | null
    avatar_url: string | null
  }
}

interface ZoneCatchesPanelProps {
  zoneId: string
  totalCatches: number
  topSpecies?: string
  onClose: () => void
}

export function ZoneCatchesPanel({ zoneId, totalCatches, topSpecies, onClose }: ZoneCatchesPanelProps) {
  const navigate = useNavigate()
  const [catches, setCatches] = useState<ZoneCatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { formatWeight } = useWeightFormatter()

  useEffect(() => {
    async function fetchZoneCatches() {
      setIsLoading(true)
      setError(null)

      // Query catches for this zone with angler profile info
      const { data, error: fetchError } = await supabase
        .from('catches')
        .select(`
          id,
          species,
          photo_url,
          caught_at,
          weight_kg,
          length_cm,
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('zone_id', zoneId)
        .order('caught_at', { ascending: false })
        .limit(20)

      if (fetchError) {
        console.error('Error fetching zone catches:', fetchError)
        setError('Unable to load catches')
        setIsLoading(false)
        return
      }

      // Flatten profiles from array to object
      const formattedData = (data || []).map((c: any) => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
      }))
      setCatches(formattedData)
      setIsLoading(false)
    }

    fetchZoneCatches()
  }, [zoneId])

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-3 max-h-[55vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:absolute md:inset-auto md:bottom-4 md:right-4 md:mx-0 md:w-80 md:max-h-[70vh]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <MapPin size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Fishing Zone</h3>
            <p className="text-xs text-muted-foreground">
              {totalCatches} catches logged · ~1km area
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[180px]">
              {zoneId}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={20} />
        </button>
      </div>

      {/* Zone info */}
      <div className="border-b border-border bg-background px-4 py-2">
        <p className="text-xs text-muted-foreground">
          Zones are ~1km hotspots. Exact marks stay private.
        </p>
        {topSpecies && (
          <p className="mt-1 text-xs font-medium text-primary">
            Top species: {topSpecies}
          </p>
        )}
        {/* Top angler in this zone */}
        {(() => {
          if (catches.length === 0) return null
          // Count catches per user
          const countByUser: Record<string, { count: number; username: string | null; avatar_url: string | null; user_id: string }> = {}
          for (const c of catches) {
            const uid = c.user_id
            if (!countByUser[uid]) {
              countByUser[uid] = {
                count: 0,
                username: c.profiles?.username || null,
                avatar_url: c.profiles?.avatar_url || null,
                user_id: uid,
              }
            }
            countByUser[uid].count++
          }
          const sorted = Object.values(countByUser).sort((a, b) => b.count - a.count)
          const topAngler = sorted[0]
          if (!topAngler || topAngler.count < 1) return null

          return (
            <button
              onClick={() => {
                if (topAngler.username) {
                  navigate(`/${topAngler.username}`)
                } else {
                  navigate(`/profile/${topAngler.user_id}`)
                }
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-500/40 p-2 text-left transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                {topAngler.avatar_url ? (
                  <img
                    src={topAngler.avatar_url}
                    alt={topAngler.username || 'Angler'}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <Trophy size={14} className="text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-amber-400 font-medium">Top Angler</p>
                <p className="text-xs font-semibold text-foreground truncate">
                  {topAngler.username ? `@${topAngler.username}` : 'Angler'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">{topAngler.count}</p>
                <p className="text-[10px] text-amber-500">catches</p>
              </div>
            </button>
          )
        })()}
      </div>

      {/* Catches list */}
      <div className="max-h-[35vh] overflow-y-auto p-4 md:max-h-[50vh]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <Fish size={32} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : catches.length === 0 ? (
          <div className="py-8 text-center">
            <Fish size={32} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No public catches in this zone</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Catches may be private or hidden
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Catches
            </p>
            {catches.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/catches/${c.id}`)}
                className="flex w-full items-center gap-3 rounded-lg bg-background p-3 text-left transition-colors hover:bg-muted"
              >
                {c.photo_url ? (
                  <img
                    src={c.photo_url}
                    alt={c.species}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                    <Fish size={20} className="text-sky-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {c.species}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {c.profiles?.username && (
                      <span className="text-primary">@{c.profiles.username}</span>
                    )}
                    <span>{format(new Date(c.caught_at), 'MMM d, yyyy')}</span>
                    {c.weight_kg && (
                      <span className="text-emerald-400 font-medium">
                        {formatWeight(c.weight_kg, { precision: 1 })}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">View →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
