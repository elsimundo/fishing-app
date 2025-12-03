import { useNavigate } from 'react-router-dom'
import type { Competition } from '../../types'

interface CompetitionCardProps {
  competition: Competition
}

const typeLabels: Record<Competition['type'], { label: string; emoji: string }> = {
  heaviest_fish: { label: 'Heaviest Fish', emoji: '⚖️' },
  most_catches: { label: 'Most Catches', emoji: '🔢' },
  species_diversity: { label: 'Species Diversity', emoji: '🌈' },
  photo_contest: { label: 'Photo Contest', emoji: '📸' },
}

const statusClasses: Record<Competition['status'], string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  ended: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

export function CompetitionCard({ competition }: CompetitionCardProps) {
  const navigate = useNavigate()
  const typeInfo = typeLabels[competition.type]

  const isActive = competition.status === 'active'
  const isUpcoming = competition.status === 'upcoming'

  const getTimeLabel = () => {
    const ends = new Date(competition.ends_at)
    const starts = new Date(competition.starts_at)

    if (isActive) {
      const diffMs = ends.getTime() - Date.now()
      const diffHours = Math.max(Math.round(diffMs / (1000 * 60 * 60)), 0)
      return `Ends in ${diffHours}h`
    }

    if (isUpcoming) {
      return `Starts ${starts.toLocaleDateString()}`
    }

    return `Ended ${ends.toLocaleDateString()}`
  }

  const handleClick = () => {
    navigate(`/compete/${competition.id}`)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Cover */}
      {competition.cover_image_url ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={competition.cover_image_url}
            alt={competition.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClasses[competition.status]}`}
            >
              {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-900">
              {typeInfo.emoji} {typeInfo.label}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative h-40 bg-gradient-to-br from-navy-700 via-blue-600 to-cyan-500">
          <div className="absolute top-3 left-3 flex gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-900`}
            >
              {typeInfo.emoji} {typeInfo.label}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{competition.title}</h3>
        {competition.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{competition.description}</p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div>
            <span className="font-semibold">{competition.participant_count ?? 0}</span>{' '}
            anglers
          </div>
          <div className="text-xs bg-gray-100 px-2 py-1 rounded-full">{getTimeLabel()}</div>
        </div>

        {competition.prize && (
          <div className="mb-3 rounded-lg bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-900">
            {competition.prize}
          </div>
        )}

        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-[11px] font-semibold text-white">
            {competition.creator?.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="text-xs text-gray-600">
            Hosted by @{competition.creator?.username ?? 'unknown'}
          </div>
        </div>
      </div>
    </button>
  )
}
