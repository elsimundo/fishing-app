import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, MapPin, Fish, Car, Coffee, BadgeCheck, Crown, Heart, EyeOff } from 'lucide-react'
import { useLakes, useToggleLakeVisibility } from '../../hooks/useLakes'
import { useAuth } from '../../hooks/useAuth'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { useSavedLakes } from '../../hooks/useSavedLakes'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { ClaimLakeModal } from '../lakes/ClaimLakeModal'
import type { Lake } from '../../types'

interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

interface NearbyLakesCardProps {
  lat: number | null
  lng: number | null
  bounds?: Bounds | null
  onSelectLake?: (lake: Lake) => void
}

export function NearbyLakesCard({ lat, lng, bounds, onSelectLake }: NearbyLakesCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [claimingLake, setClaimingLake] = useState<Lake | null>(null)
  const { user } = useAuth()
  const { isAdmin } = useAdminAuth()
  const { isLakeSaved, toggleSave, isPending: isSavePending } = useSavedLakes()
  const toggleVisibility = useToggleLakeVisibility()
  const { data: lakes, isLoading, error } = useLakes({
    lat,
    lng,
    bounds,
    radiusKm: 100,
    enabled: lat !== null && lng !== null,
  })

  if (!lat || !lng) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="text-xl">🏞️</span>
          <span className="text-sm font-medium">Fishing Lakes</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">Search a location to see nearby lakes</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
            <Loader2 size={20} className="animate-spin text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Finding Lakes</p>
            <p className="text-xs text-gray-500">Searching nearby venues...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !lakes) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="text-xl">🏞️</span>
          <span className="text-sm font-medium">Fishing Lakes</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">Unable to load nearby lakes</p>
      </div>
    )
  }

  const hasLakes = lakes.length > 0

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
            <span className="text-xl">🏞️</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Fishing Lakes</p>
            {hasLakes ? (
              <p className="text-xs text-gray-600">
                {lakes.length} venue{lakes.length !== 1 ? 's' : ''} nearby
              </p>
            ) : (
              <p className="text-xs text-gray-500">No lakes found nearby</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasLakes && lakes[0] && !expanded && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Nearest</p>
              <p className="max-w-[120px] truncate text-sm font-semibold text-gray-900">
                {lakes[0].name}
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
          {!hasLakes ? (
            <div className="mt-3 rounded-lg bg-gray-50 p-4 text-center">
              <span className="text-3xl">🏞️</span>
              <p className="mt-2 text-sm font-medium text-gray-600">No lakes found nearby</p>
              <p className="mt-1 text-xs text-gray-500">
                Try searching a different area
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {lakes.slice(0, showAll ? undefined : 5).map((lake) => (
                <LakeItem
                  key={lake.id}
                  lake={lake}
                  canClaim={!!user}
                  onSelect={onSelectLake}
                  isSaved={typeof lake.id === 'string' && !lake.id.startsWith('osm-') ? isLakeSaved(lake.id) : false}
                  onToggleSave={typeof lake.id === 'string' && !lake.id.startsWith('osm-') && user ? () => toggleSave(lake.id) : undefined}
                  isSaving={isSavePending}
                  isAdmin={isAdmin}
                  onHide={isAdmin && typeof lake.id === 'string' && !lake.id.startsWith('osm-') ? async () => {
                    try {
                      await toggleVisibility.mutateAsync({ lakeId: lake.id, hide: true })
                      toast.success(`"${lake.name}" hidden from Explore`)
                    } catch (err) {
                      toast.error('Failed to hide lake')
                    }
                  } : undefined}
                  isHiding={toggleVisibility.isPending}
                  onClaim={() => {
                    if (!user) {
                      toast.error('You need to be logged in to claim a venue')
                      return
                    }

                    // DB lakes: check if already claimed
                    if (lake.claimed_by) {
                      toast('This venue is already claimed')
                      return
                    }

                    // Allow claiming both DB lakes and OSM lakes
                    // OSM lakes will be converted to DB lakes during the claim process
                    setClaimingLake(lake)
                  }}
                />
              ))}
              
              {lakes.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  {showAll ? 'Show less' : `Show ${lakes.length - 5} more`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Claim Modal */}
      {claimingLake && user && (
        <ClaimLakeModal
          lake={claimingLake}
          userId={user.id}
          onClose={() => setClaimingLake(null)}
          onSuccess={() => {
            setClaimingLake(null)
            toast.success('Claim submitted! We\'ll review it within 24-48 hours.')
          }}
        />
      )}
    </div>
  )
}

const LAKE_TYPE_LABELS: Record<string, string> = {
  commercial: 'Commercial',
  syndicate: 'Syndicate',
  club: 'Club',
  day_ticket: 'Day Ticket',
  public: 'Public',
  private: 'Private',
}

interface LakeItemProps {
  lake: Lake
  canClaim?: boolean
  onClaim?: () => void
  onSelect?: (lake: Lake) => void
  isSaved?: boolean
  onToggleSave?: () => void
  isSaving?: boolean
  isAdmin?: boolean
  onHide?: () => void
  isHiding?: boolean
}

function LakeItem({ lake, canClaim, onClaim, onSelect, isSaved, onToggleSave, isSaving, isAdmin, onHide, isHiding }: LakeItemProps) {
  const handleClick = () => {
    onSelect?.(lake)
  }

  return (
    <div
      className="cursor-pointer rounded-lg border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-gray-900">{lake.name}</h4>
            {/* Ownership badges */}
            {lake.is_premium && (
              <span title="Premium Venue">
                <Crown size={14} className="text-amber-500" />
              </span>
            )}
            {lake.claimed_by && !lake.is_premium && (
              <span title="Verified Owner">
                <BadgeCheck size={14} className="text-blue-500" />
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {lake.lake_type && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                {LAKE_TYPE_LABELS[lake.lake_type] || lake.lake_type}
              </span>
            )}
            {lake.region && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={10} />
                {lake.region}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lake.distance !== undefined && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
              {lake.distance.toFixed(1)} km
            </span>
          )}
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSave()
              }}
              disabled={isSaving}
              className={`rounded-full p-1.5 transition-colors ${
                isSaved 
                  ? 'text-pink-500 hover:bg-pink-100' 
                  : 'text-gray-300 hover:bg-gray-200 hover:text-pink-400'
              }`}
              title={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {(lake.total_sessions || lake.total_catches) && (
        <div className="mt-2 flex gap-3 text-[10px] text-gray-600">
          {lake.total_sessions ? (
            <span>📊 {lake.total_sessions} sessions</span>
          ) : null}
          {lake.total_catches ? (
            <span>🐟 {lake.total_catches} catches</span>
          ) : null}
        </div>
      )}

      {/* Species */}
      {lake.species && lake.species.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lake.species.slice(0, 4).map((species) => (
            <span
              key={species}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
            >
              <Fish size={10} />
              {species}
            </span>
          ))}
          {lake.species.length > 4 && (
            <span className="text-[10px] text-gray-500">+{lake.species.length - 4} more</span>
          )}
        </div>
      )}

      {/* Facilities */}
      <div className="mt-2 flex flex-wrap gap-2">
        {lake.has_parking && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Car size={10} /> Parking
          </span>
        )}
        {lake.has_cafe && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Coffee size={10} /> Café
          </span>
        )}
        {lake.is_night_fishing_allowed && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            🌙 Night fishing
          </span>
        )}
      </div>

      {/* Pricing - only show for claimed lakes */}
      {lake.claimed_by && lake.day_ticket_price && (
        <p className="mt-2 text-xs font-medium text-gray-700">
          Day ticket: £{lake.day_ticket_price.toFixed(2)}
        </p>
      )}

      {/* Website / Claim / Details actions */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* Website - only show for claimed lakes */}
        {lake.claimed_by && lake.website && (
          <a
            href={lake.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
            onClick={(e) => e.stopPropagation()}
          >
            Visit website →
          </a>
        )}

        {/* Claim this venue (for unclaimed DB lakes OR any OSM lake) */}
        {canClaim && onClaim && !lake.claimed_by && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClaim()
            }}
            className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-primary/90"
          >
            Claim this venue
          </button>
        )}

        {/* Details page link (uses slug if present, else id) */}
        {typeof lake.id === 'string' && !lake.id.startsWith('osm-') && (
          <Link
            to={`/lakes/${lake.slug || lake.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Details
          </Link>
        )}

        {/* Admin: Hide from map button */}
        {isAdmin && onHide && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onHide()
            }}
            disabled={isHiding}
            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
            title="Admin: Hide this lake from Explore (soft-delete)"
          >
            <EyeOff size={10} />
            Hide from map
          </button>
        )}
      </div>
    </div>
  )
}
