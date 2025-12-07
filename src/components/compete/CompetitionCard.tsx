import { useNavigate } from 'react-router-dom'
import { Clock, Users, ChevronRight } from 'lucide-react'
import type { Competition } from '../../types'

interface CompetitionCardProps {
  competition: Competition
}

const typeConfig: Record<Competition['type'], { label: string; emoji: string; color: string }> = {
  heaviest_fish: { label: 'Heaviest Fish', emoji: '⚖️', color: 'bg-blue-500' },
  most_catches: { label: 'Most Catches', emoji: '🔢', color: 'bg-green-500' },
  species_diversity: { label: 'Species Diversity', emoji: '🌈', color: 'bg-purple-500' },
  photo_contest: { label: 'Photo Contest', emoji: '📸', color: 'bg-pink-500' },
}

const statusConfig: Record<string, { label: string; bg: string; dot: boolean }> = {
  active: { label: 'Live', bg: 'bg-green-500', dot: true },
  upcoming: { label: 'Upcoming', bg: 'bg-blue-500', dot: false },
  ended: { label: 'Ended', bg: 'bg-gray-400', dot: false },
  cancelled: { label: 'Cancelled', bg: 'bg-red-400', dot: false },
}

export function CompetitionCard({ competition }: CompetitionCardProps) {
  const navigate = useNavigate()
  const typeInfo = typeConfig[competition.type]
  const statusInfo = statusConfig[competition.status] || statusConfig.ended

  const formatTimeRemaining = (endsAt: string): string => {
    const end = new Date(endsAt).getTime()
    const now = Date.now()
    if (Number.isNaN(end) || end <= now) return 'Ended'
    
    const diffMinutes = Math.round((end - now) / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d left`
    if (hours > 0) return `${hours}h left`
    return `${diffMinutes}m left`
  }

  const handleClick = () => {
    navigate(`/compete/${competition.id}`)
  }

  const timeRemaining = formatTimeRemaining(competition.ends_at)

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.99]"
    >
      {/* Top Row: Status + Type */}
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${statusInfo.bg}`}>
          {statusInfo.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
          {statusInfo.label}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
          {typeInfo.emoji} {typeInfo.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-3 text-base font-bold text-gray-900 leading-tight">
        {competition.title}
      </h3>

      {/* Stats Row */}
      <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Users size={14} className="text-gray-400" />
          <span>{competition.participant_count ?? 0} anglers</span>
        </div>
        {competition.status === 'active' && (
          <div className="flex items-center gap-1">
            <Clock size={14} className="text-gray-400" />
            <span>{timeRemaining}</span>
          </div>
        )}
      </div>

      {/* Prize (if exists) */}
      {competition.prize && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          🏆 {competition.prize}
        </div>
      )}

      {/* Footer: Host + Arrow */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2">
          {competition.creator?.avatar_url ? (
            <img
              src={competition.creator.avatar_url}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">
              {competition.creator?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <span className="text-xs text-gray-500">
            @{competition.creator?.username ?? 'unknown'}
          </span>
        </div>
        <ChevronRight size={18} className="text-gray-400 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}
