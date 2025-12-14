import { ChevronRight, Award } from 'lucide-react'
import type { UserChallenge } from '../../hooks/useGamification'

interface BadgesSummaryCardProps {
  completedChallenges: UserChallenge[]
  totalBadges?: number
  onClick?: () => void
}

export function BadgesSummaryCard({
  completedChallenges,
  totalBadges = 12,
  onClick,
}: BadgesSummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl bg-violet-900/80 px-4 py-3 text-left transition-colors hover:bg-violet-900"
    >
      <div className="flex items-center gap-2">
        <Award size={16} className="text-amber-400" />
        <span className="text-sm font-medium text-white">
          Badges & Achievements
        </span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white/80">
          {completedChallenges.length}/{totalBadges}
        </span>
      </div>
      <ChevronRight size={16} className="text-white/60" />
    </button>
  )
}
