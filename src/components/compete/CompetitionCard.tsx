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

export function CompetitionCard({ competition }: CompetitionCardProps) {
  const navigate = useNavigate()
  const typeInfo = typeLabels[competition.type]

  const isActive = competition.status === 'active'
  const isUpcoming = competition.status === 'upcoming'

  const formatTimeRemaining = (endsAt: string): string => {
    const end = new Date(endsAt).getTime()
    const now = Date.now()
    if (Number.isNaN(end) || end <= now) return 'Ended'
    
    const diffMinutes = Math.round((end - now) / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h left`
    if (hours === 0) return `${minutes}m left`
    if (minutes === 0) return `${hours}h left`
    return `${hours}h ${minutes}m left`
  }

  const handleClick = () => {
    navigate(`/compete/${competition.id}`)
  }

  const timeRemaining = formatTimeRemaining(competition.ends_at)

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 p-4 text-xs text-white shadow-lg transition-transform hover:scale-[1.02]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-yellow-100">
            {isActive ? 'Active Competition' : isUpcoming ? 'Upcoming Competition' : 'Ended Competition'}
          </p>
          <p className="text-base font-semibold text-white">{competition.title}</p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Live · {timeRemaining}
              </span>
            )}
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">
              {typeInfo.emoji} {typeInfo.label}
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">
              {competition.participant_count ?? 0} anglers
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="rounded-full border border-white/70 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
            View
          </div>
        </div>
      </div>
      
      {competition.prize && (
        <div className="mt-3 rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
          🏆 {competition.prize}
        </div>
      )}
      
      <div className="mt-3 flex items-center gap-2 border-t border-white/20 pt-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
          {competition.creator?.username?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="text-[11px] text-white/90">
          Hosted by @{competition.creator?.username ?? 'unknown'}
        </div>
      </div>
    </button>
  )
}
