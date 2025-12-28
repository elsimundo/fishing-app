import { useEffect } from 'react'
import { X, Flame } from 'lucide-react'
import type { UserChallenge } from '../../hooks/useGamification'

interface BadgesModalProps {
  completedChallenges: UserChallenge[]
  onClose: () => void
  isOwnProfile?: boolean
  currentStreak?: number
  longestStreak?: number
}

export function BadgesModal({ 
  completedChallenges, 
  onClose, 
  isOwnProfile = false,
  currentStreak = 0,
  longestStreak = 0,
}: BadgesModalProps) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-md rounded-t-2xl bg-card border border-border shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">🏆 Achievements</h2>
            <p className="text-xs text-muted-foreground">
              {completedChallenges.length} badges earned
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {/* Streak Section */}
          <div className="mb-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Flame size={24} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">Current Streak</p>
                <p className="text-3xl font-bold tabular-nums">{currentStreak} <span className="text-base font-medium text-white/80">days</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">Best</p>
                <p className="text-xl font-bold tabular-nums">{longestStreak}</p>
              </div>
            </div>
            {currentStreak > 0 && (
              <p className="mt-2 text-[11px] text-white/80">
                {currentStreak >= longestStreak ? "🔥 You're on your best streak!" : "Keep fishing to beat your record!"}
              </p>
            )}
          </div>

          {/* Badges Section */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Badges</h3>
            <span className="text-xs text-muted-foreground">{completedChallenges.length} / 12</span>
          </div>
          
          {completedChallenges.length === 0 ? (
            <div className="rounded-xl bg-muted/50 py-6 text-center">
              <div className="mx-auto mb-2 text-3xl">🎣</div>
              <p className="text-sm font-medium text-foreground">No badges yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isOwnProfile
                  ? 'Log catches and sessions to earn badges.'
                  : 'This angler hasn\'t earned any badges yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {completedChallenges.map((uc) => (
                <div
                  key={uc.id}
                  className="rounded-xl border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/30 p-3"
                >
                  <div className="mb-2 text-3xl">{uc.challenge?.icon || '🎣'}</div>
                  <p className="text-sm font-semibold text-foreground">
                    {uc.challenge?.title || 'Challenge'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                    {uc.challenge?.description || ''}
                  </p>
                  {uc.completed_at && (
                    <p className="mt-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      ✓ Earned {new Date(uc.completed_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
