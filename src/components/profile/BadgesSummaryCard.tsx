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
      className="w-full rounded-xl bg-gradient-to-br from-[#0D4B4E] to-[#1BA9A0] p-3 text-xs text-white text-left transition-all hover:from-[#1A2D3D] hover:to-[#14B8A6] hover:shadow-lg border border-[#334155]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold">🏆 Badges</p>
        <p className="text-[11px] text-white/80">
          {completedChallenges.length}/{totalBadges} earned
        </p>
      </div>
      <div className="flex gap-2">
        {completedChallenges.slice(0, 3).map((uc) => (
          <div
            key={uc.id}
            className="flex-1 rounded-lg bg-white/10 p-2 text-[11px] backdrop-blur"
          >
            <div className="mb-1 text-lg">{uc.challenge?.icon || '🎣'}</div>
            <p className="font-semibold leading-tight">
              {uc.challenge?.title || 'Challenge'}
            </p>
          </div>
        ))}
        {completedChallenges.length === 0 && (
          <p className="text-[11px] text-white/80">
            Start logging catches and sessions to earn your first badge.
          </p>
        )}
      </div>
    </button>
  )
}
