import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, MapPin, Fish, Car, Coffee, BadgeCheck, Crown, Heart, EyeOff, UserPlus, X, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
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
  const [assigningLake, setAssigningLake] = useState<Lake | null>(null)
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
      <div className="rounded-xl border border-[#334155] bg-[#243B4A] p-4">
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
      <div className="rounded-xl border border-[#334155] bg-[#243B4A] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-900/30">
            <Loader2 size={20} className="animate-spin text-sky-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Finding Lakes</p>
            <p className="text-xs text-gray-400">Searching nearby venues...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !lakes) {
    return (
      <div className="rounded-xl border border-[#334155] bg-[#243B4A] p-4">
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
    <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#243B4A]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[#1A2D3D]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-900/30">
            <span className="text-xl">🏞️</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Fishing Lakes</p>
            {hasLakes ? (
              <p className="text-xs text-gray-400">
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
              <p className="max-w-[120px] truncate text-sm font-semibold text-white">
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
        <div className="border-t border-[#334155] px-4 pb-4">
          {!hasLakes ? (
            <div className="mt-3 rounded-lg bg-[#1A2D3D] p-4 text-center">
              <span className="text-3xl">🏞️</span>
              <p className="mt-2 text-sm font-medium text-gray-300">No lakes found nearby</p>
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
                  onAssignOwner={isAdmin && typeof lake.id === 'string' && !lake.id.startsWith('osm-') ? () => setAssigningLake(lake) : undefined}
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
                  className="w-full rounded-lg bg-[#1A2D3D] py-2 text-xs font-medium text-gray-300 hover:bg-[#0D4B4E]"
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

      {/* Assign Owner Modal (Admin only) */}
      {assigningLake && isAdmin && (
        <AssignOwnerModal
          lakeId={assigningLake.id}
          lakeName={assigningLake.name}
          onClose={() => setAssigningLake(null)}
          onSuccess={() => {
            setAssigningLake(null)
            toast.success('Owner assigned successfully!')
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
  onAssignOwner?: () => void
}

function LakeItem({ lake, canClaim, onClaim, onSelect, isSaved, onToggleSave, isSaving, isAdmin, onHide, isHiding, onAssignOwner }: LakeItemProps) {
  const handleClick = () => {
    onSelect?.(lake)
  }

  return (
    <div
      className="cursor-pointer rounded-lg border border-[#334155] bg-[#1A2D3D] p-3 hover:bg-[#0D4B4E]"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-white">{lake.name}</h4>
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
              <span className="rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
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
            <span className="rounded-full bg-sky-900/30 px-2 py-0.5 text-xs font-medium text-sky-400">
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
                  ? 'text-pink-500 hover:bg-pink-900/30' 
                  : 'text-gray-500 hover:bg-[#334155] hover:text-pink-400'
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
        <div className="mt-2 flex gap-3 text-[10px] text-gray-400">
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
              className="inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
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
        <p className="mt-2 text-xs font-medium text-gray-300">
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
            className="inline-block text-xs font-medium text-[#1BA9A0] hover:text-[#14B8A6]"
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
            className="inline-flex items-center rounded-full bg-[#1BA9A0] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#14B8A6]"
          >
            Claim this venue
          </button>
        )}

        {/* Details page link (uses slug if present, else id) */}
        {typeof lake.id === 'string' && !lake.id.startsWith('osm-') && (
          <Link
            to={`/lakes/${lake.slug || lake.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block text-xs font-medium text-gray-400 hover:text-white"
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
            className="inline-flex items-center gap-1 rounded-full bg-red-900/30 px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-900/50 disabled:opacity-50"
            title="Admin: Hide this lake from Explore (soft-delete)"
          >
            <EyeOff size={10} />
            Hide from map
          </button>
        )}

        {/* Admin: Assign owner button */}
        {isAdmin && !lake.id.startsWith('osm-') && onAssignOwner && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAssignOwner()
            }}
            className="inline-flex items-center gap-1 rounded-full bg-purple-900/30 px-2.5 py-1 text-[10px] font-semibold text-purple-400 hover:bg-purple-900/50"
            title="Admin: Assign an owner to this lake"
          >
            <UserPlus size={10} />
            Assign Owner
          </button>
        )}
      </div>
    </div>
  )
}

// Admin modal to quickly assign a lake owner by username
function AssignOwnerModal({
  lakeId,
  lakeName,
  onClose,
  onSuccess,
}: {
  lakeId: string
  lakeName: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>>([])
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string } | null>(null)

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    setIsSearching(true)
    setSearchResults([])

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
      .limit(10)

    setIsSearching(false)
    if (error) {
      toast.error('Search failed')
      return
    }
    setSearchResults(data || [])
  }

  const handleAssign = async () => {
    if (!selectedUser) return
    setIsAssigning(true)

    const { error } = await supabase
      .from('lakes')
      .update({
        claimed_by: selectedUser.id,
        claimed_at: new Date().toISOString(),
        is_verified: true,
      })
      .eq('id', lakeId)

    if (error) {
      setIsAssigning(false)
      toast.error('Failed to assign owner')
      return
    }

    // Send notification to the new owner
    await supabase.from('notifications').insert({
      user_id: selectedUser.id,
      type: 'lake_claim_approved',
      title: 'You\'ve been assigned as lake owner!',
      message: `You are now the owner of ${lakeName}. You can manage it from your dashboard.`,
      related_lake_id: lakeId,
      action_url: `/lakes/${lakeId}/dashboard`,
    })

    setIsAssigning(false)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#243B4A] border border-[#334155] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Assign Owner</h2>
            <p className="text-sm text-gray-400">{lakeName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-[#1A2D3D] hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-400">
            Search by username
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter username..."
              className="flex-1 rounded-lg border border-[#334155] bg-[#1A2D3D] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#1BA9A0] focus:outline-none focus:ring-1 focus:ring-[#1BA9A0]"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="rounded-lg bg-[#1BA9A0] px-4 py-2 text-sm font-medium text-white hover:bg-[#14B8A6] disabled:bg-[#1BA9A0]/60"
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>
        </div>

        {/* Results */}
        {searchResults.length > 0 && (
          <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-[#334155]">
            {searchResults.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUser({ id: user.id, username: user.username })}
                className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                  selectedUser?.id === user.id
                    ? 'bg-[#1BA9A0]/20 border-l-4 border-[#1BA9A0]'
                    : 'hover:bg-[#1A2D3D] border-l-4 border-transparent'
                }`}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#334155] text-xs font-medium text-gray-300">
                    {user.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">@{user.username}</p>
                  {user.display_name && (
                    <p className="text-xs text-gray-500">{user.display_name}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchTerm && !isSearching && (
          <p className="mb-4 text-center text-sm text-gray-500">No users found</p>
        )}

        {/* Selected user confirmation */}
        {selectedUser && (
          <div className="mb-4 rounded-lg bg-emerald-900/30 border border-emerald-500/40 p-3">
            <p className="text-sm text-emerald-400">
              <span className="font-medium">@{selectedUser.username}</span> will be assigned as owner of this lake.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#334155] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1A2D3D]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedUser || isAssigning}
            className="flex-1 rounded-lg bg-[#1BA9A0] px-4 py-2 text-sm font-medium text-white hover:bg-[#14B8A6] disabled:bg-[#1BA9A0]/60"
          >
            {isAssigning ? 'Assigning...' : 'Assign Owner'}
          </button>
        </div>
      </div>
    </div>
  )
}
