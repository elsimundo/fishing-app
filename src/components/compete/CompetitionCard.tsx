import { useNavigate } from 'react-router-dom'
import { Clock, Users, Trophy, Swords, ChevronRight } from 'lucide-react'
import type { Competition } from '../../types'

interface CompetitionCardProps {
  competition: Competition
}

const typeConfig: Record<Competition['type'], { label: string; icon: string }> = {
  heaviest_fish: { label: 'Heaviest Fish', icon: '⚖️' },
  most_catches: { label: 'Most Catches', icon: '🔢' },
  species_diversity: { label: 'Species Diversity', icon: '🌈' },
  photo_contest: { label: 'Photo Contest', icon: '📸' },
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

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-sm shadow-sm transition-colors ${
        isActive
          ? 'border-amber-500 bg-gradient-to-r from-amber-900/30 to-yellow-900/20 hover:from-amber-900/40 hover:to-yellow-900/30'
          : 'border-border bg-card hover:border-primary/40 hover:bg-background'
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xl ${
          isActive ? 'bg-amber-500 text-white' : 'bg-background text-muted-foreground'
        }`}
      >
        <Swords size={24} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {competition.title}
          </p>
          {isActive && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              LIVE
            </span>
          )}
          {isUpcoming && (
            <span className="rounded-full bg-blue-900/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
              SOON
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {typeInfo.icon} {typeInfo.label}
        </p>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {competition.participant_count ?? 0} anglers
          </span>
          {isActive && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {timeRemaining}
            </span>
          )}
          {competition.prize && (
            <span className="flex items-center gap-1 text-amber-400">
              <Trophy size={12} />
              {competition.prize}
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight size={18} className="flex-shrink-0 text-muted-foreground" />
    </button>
  )
}
