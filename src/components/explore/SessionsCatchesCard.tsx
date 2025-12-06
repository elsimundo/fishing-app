import { useState } from 'react'
import { Fish, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { calculateDistance, formatDistance } from '../../utils/distance'
import { format } from 'date-fns'

interface Session {
  id: string
  title?: string
  location_name?: string
  latitude?: number
  longitude?: number
  started_at?: string
}

interface Catch {
  id: string
  species: string
  latitude?: number
  longitude?: number
  caught_at?: string
}

interface SessionsCatchesCardProps {
  lat: number | null
  lng: number | null
  sessions: Session[]
  catches: Catch[]
}

export function SessionsCatchesCard({ lat, lng, sessions, catches }: SessionsCatchesCardProps) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  // Filter to nearby items (within 25km of search location)
  const nearbySessions = sessions
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({
      ...s,
      distance: lat && lng && s.latitude && s.longitude
        ? calculateDistance(lat, lng, s.latitude, s.longitude)
        : undefined,
    }))
    .filter((s) => s.distance === undefined || s.distance < 25)
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, 5)

  const nearbyCatches = catches
    .filter((c) => c.latitude && c.longitude)
    .map((c) => ({
      ...c,
      distance: lat && lng && c.latitude && c.longitude
        ? calculateDistance(lat, lng, c.latitude, c.longitude)
        : undefined,
    }))
    .filter((c) => c.distance === undefined || c.distance < 25)
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, 5)

  const totalNearby = nearbySessions.length + nearbyCatches.length

  if (totalNearby === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <Fish size={20} />
          <span className="text-sm font-medium">Sessions & Catches</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">No fishing activity recorded nearby</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Fish size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Sessions & Catches</p>
            <p className="text-xs text-gray-600">
              {nearbySessions.length} sessions · {nearbyCatches.length} catches nearby
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {/* Sessions */}
          {nearbySessions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Recent Sessions
              </p>
              <div className="mt-2 space-y-2">
                {nearbySessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    className="flex w-full items-center justify-between rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                        <span className="text-sm">🎣</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {session.title || session.location_name || 'Fishing Session'}
                        </p>
                        {session.started_at && (
                          <p className="text-xs text-gray-500">
                            {format(new Date(session.started_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    {session.distance !== undefined && (
                      <span className="text-xs font-medium text-gray-600">
                        {formatDistance(session.distance)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Catches */}
          {nearbyCatches.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Recent Catches
              </p>
              <div className="mt-2 space-y-2">
                {nearbyCatches.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/catches/${c.id}`)}
                    className="flex w-full items-center justify-between rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100">
                        <span className="text-sm">🐟</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.species}</p>
                        {c.caught_at && (
                          <p className="text-xs text-gray-500">
                            {format(new Date(c.caught_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    {c.distance !== undefined && (
                      <span className="text-xs font-medium text-gray-600">
                        {formatDistance(c.distance)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
