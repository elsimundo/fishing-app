import { Award, ChevronRight } from 'lucide-react'
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
  const progress = Math.round((completedChallenges.length / totalBadges) * 100)
  
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-gradient-to-br from-primary via-teal-600 to-cyan-700 p-4 text-left text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Award size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold">Badges</h3>
            <p className="text-[10px] text-white/70">{completedChallenges.length} of {totalBadges} earned</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-white/60" />
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
        <div 
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Badges preview */}
      <div className="flex gap-2">
        {completedChallenges.length > 0 ? (
          completedChallenges.slice(0, 3).map((uc) => (
            <div
              key={uc.id}
              className="flex-1 rounded-xl bg-white/15 p-2 text-center backdrop-blur"
            >
              <div className="text-xl">{uc.challenge?.icon || '🎣'}</div>
              <p className="mt-0.5 truncate text-[9px] font-medium text-white/80">
                {uc.challenge?.title || 'Badge'}
              </p>
            </div>
          ))
        ) : (
          <div className="flex-1 rounded-xl bg-white/10 p-3 text-center">
            <p className="text-[11px] text-white/70">
              Log catches to earn badges!
            </p>
          </div>
        )}
        {completedChallenges.length > 0 && completedChallenges.length < 3 && (
          Array.from({ length: 3 - completedChallenges.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 rounded-xl border border-dashed border-white/30 p-2 text-center">
              <div className="text-xl opacity-40">🔒</div>
              <p className="mt-0.5 text-[9px] font-medium text-white/40">Locked</p>
            </div>
          ))
        )}
      </div>
    </button>
  )
}
