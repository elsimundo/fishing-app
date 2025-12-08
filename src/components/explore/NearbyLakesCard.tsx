import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, MapPin, Fish, Car, Coffee } from 'lucide-react'
import { useLakes } from '../../hooks/useLakes'
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
}

export function NearbyLakesCard({ lat, lng, bounds }: NearbyLakesCardProps) {
  const [expanded, setExpanded] = useState(false)
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
              {lakes.slice(0, 5).map((lake) => (
                <LakeItem key={lake.id} lake={lake} />
              ))}
            </div>
          )}
        </div>
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

function LakeItem({ lake }: { lake: Lake }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">{lake.name}</h4>
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
        {lake.distance !== undefined && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
            {lake.distance.toFixed(1)} km
          </span>
        )}
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

      {/* Pricing */}
      {lake.day_ticket_price && (
        <p className="mt-2 text-xs font-medium text-gray-700">
          Day ticket: £{lake.day_ticket_price.toFixed(2)}
        </p>
      )}

      {/* Website link */}
      {lake.website && (
        <a
          href={lake.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Visit website →
        </a>
      )}
    </div>
  )
}
