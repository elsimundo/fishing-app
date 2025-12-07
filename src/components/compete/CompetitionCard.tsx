import { useNavigate } from 'react-router-dom'
import { Clock, Users, Trophy } from 'lucide-react'
import type { Competition } from '../../types'

interface CompetitionCardProps {
  competition: Competition
}

const typeConfig: Record<Competition['type'], { label: string; emoji: string }> = {
  heaviest_fish: { label: 'Heaviest Fish', emoji: '⚖️' },
  most_catches: { label: 'Most Catches', emoji: '🔢' },
  species_diversity: { label: 'Species Diversity', emoji: '🌈' },
  photo_contest: { label: 'Photo Contest', emoji: '📸' },
}

export function CompetitionCard({ competition }: CompetitionCardProps) {
  const navigate = useNavigate()
  const typeInfo = typeConfig[competition.type]
  const isActive = competition.status === 'active'
  const isUpcoming = competition.status === 'upcoming'

  const formatTimeRemaining = (endsAt: string): string => {
    const end = new Date(endsAt).getTime()
    const now = Date.now()
    if (Number.isNaN(end) || end <= now) return 'Ended'
    
    const diffMinutes = Math.round((end - now) / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${diffMinutes % 60}m`
    return `${diffMinutes}m`
  }

  const handleClick = () => {
    navigate(`/compete/${competition.id}`)
  }

  const timeRemaining = formatTimeRemaining(competition.ends_at)

  // Dynamic gradient based on status
  const cardGradient = isActive
    ? 'from-emerald-500 to-teal-600'
    : isUpcoming
    ? 'from-blue-500 to-indigo-600'
    : 'from-gray-400 to-gray-500'

  const ctaText = isActive ? 'Join Now' : isUpcoming ? 'View Details' : 'See Results'

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
    >
      {/* Colored Header */}
      <div className={`bg-gradient-to-r ${cardGradient} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
            )}
            {isUpcoming && (
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white">
                UPCOMING
              </span>
            )}
            <span className="text-sm text-white/90">
              {typeInfo.emoji} {typeInfo.label}
            </span>
          </div>
          {isActive && (
            <div className="flex items-center gap-1 text-xs font-semibold text-white">
              <Clock size={14} />
              <span>{timeRemaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="mb-2 text-lg font-bold text-gray-900 leading-tight">
          {competition.title}
        </h3>

        {/* Prize Banner */}
        {competition.prize && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
            <Trophy size={18} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-800">{competition.prize}</span>
          </div>
        )}

        {/* Stats */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users size={16} className="text-gray-400" />
            <span className="font-medium">{competition.participant_count ?? 0}</span>
            <span className="text-gray-400">anglers</span>
          </div>
        </div>

        {/* Footer: Host + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {competition.creator?.avatar_url ? (
              <img
                src={competition.creator.avatar_url}
                alt=""
                className="h-7 w-7 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white ring-2 ring-gray-100">
                {competition.creator?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <span className="text-sm text-gray-500">
              @{competition.creator?.username ?? 'unknown'}
            </span>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105 ${
              isActive
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : isUpcoming
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-400 hover:bg-gray-500'
            }`}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  )
}
