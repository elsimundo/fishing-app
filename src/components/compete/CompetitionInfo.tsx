import type { Competition } from '../../types'

interface CompetitionInfoProps {
  competition: Competition
}

export function CompetitionInfo({ competition }: CompetitionInfoProps) {
  return (
    <div className="bg-white px-5 py-6 space-y-6">
      {competition.description && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">About</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{competition.description}</p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Rules</h2>
        <div className="space-y-3 text-sm text-gray-700">
          {competition.allowed_species && competition.allowed_species.length > 0 && (
            <div>
              <p className="font-medium text-gray-900">Allowed species</p>
              <p>{competition.allowed_species.join(', ')}</p>
            </div>
          )}

          {competition.water_type && competition.water_type !== 'any' && (
            <div>
              <p className="font-medium text-gray-900">Water type</p>
              <p className="capitalize">{competition.water_type}</p>
            </div>
          )}

          {competition.location_restriction && (
            <div>
              <p className="font-medium text-gray-900">Location</p>
              <p>Within {competition.location_restriction.radius_km}km of the target area</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Schedule</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <div>
            <p className="font-medium text-gray-900">Starts</p>
            <p>{new Date(competition.starts_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Ends</p>
            <p>{new Date(competition.ends_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Participants</h2>
        <p className="text-sm text-gray-700">
          {competition.participant_count ?? 0} anglers joined
          {competition.max_participants && (
            <span>
              {' '}
              (max {competition.max_participants})
            </span>
          )}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Hosted by</h2>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-sm font-semibold text-white">
            {competition.creator?.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {competition.creator?.full_name || competition.creator?.username || 'Unknown'}
            </p>
            <p className="text-xs text-gray-600">@{competition.creator?.username ?? 'angler'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
