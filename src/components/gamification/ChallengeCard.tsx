import { Check, Lock, Star } from 'lucide-react'
import type { Challenge, UserChallenge } from '../../hooks/useGamification'

interface ChallengeCardProps {
  challenge: Challenge
  userProgress?: UserChallenge
  onClick?: () => void
  compact?: boolean
}

export function ChallengeCard({ challenge, userProgress, onClick, compact = false }: ChallengeCardProps) {
  const isCompleted = !!userProgress?.completed_at
  const progress = userProgress?.progress || 0
  const target = userProgress?.target || (challenge.criteria as any)?.value || 1
  const progressPercent = Math.min(100, Math.round((progress / target) * 100))
  
  const difficultyConfig: Record<string, { color: string; bg: string; label: string }> = {
    easy: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Easy' },
    medium: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Medium' },
    hard: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Hard' },
    expert: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Expert' },
    legendary: { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Legendary' },
  }
  
  const difficulty = difficultyConfig[challenge.difficulty] || difficultyConfig.medium
  
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          flex items-center gap-2 p-2 rounded-lg border transition-all
          ${isCompleted 
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/40' 
            : 'bg-card border-border hover:border-primary'
          }
        `}
      >
        <span className="text-xl">{challenge.icon}</span>
        <div className="flex-1 text-left">
          <p className={`text-xs font-medium ${isCompleted ? 'text-emerald-400' : 'text-foreground'}`}>
            {challenge.title}
          </p>
        </div>
        {isCompleted && <Check size={14} className="text-emerald-400" />}
      </button>
    )
  }
  
  return (
    <button
      onClick={onClick}
      className={`
        relative w-full p-4 rounded-xl border-2 transition-all text-left
        ${isCompleted 
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/40 shadow-sm' 
          : 'bg-card border-border hover:border-primary hover:shadow-md'
        }
      `}
    >
      {/* Featured badge */}
      {challenge.is_featured && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900 rounded-full p-1">
          <Star size={12} fill="currentColor" />
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center text-2xl
          ${isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-background'}
        `}>
          {challenge.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold truncate ${isCompleted ? 'text-emerald-400' : 'text-foreground'}`}>
              {challenge.title}
            </h3>
            {isCompleted && (
              <div className="flex-shrink-0 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {challenge.description}
          </p>
        </div>
      </div>
      
      {/* Progress bar (if not completed and has progress) */}
      {!isCompleted && target > 1 && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{progress} / {target}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${difficulty.bg} ${difficulty.color}`}>
          {difficulty.label}
        </span>
        <span className={`text-xs font-semibold ${isCompleted ? 'text-emerald-400' : 'text-primary'}`}>
          {isCompleted ? 'Completed' : `+${challenge.xp_reward} XP`}
        </span>
      </div>
    </button>
  )
}

// Locked challenge placeholder
export function LockedChallengeCard() {
  return (
    <div className="w-full p-4 rounded-xl border-2 border-dashed border-border bg-background">
      <div className="flex items-center gap-3 opacity-50">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <Lock size={20} className="text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-muted-foreground">Coming Soon</h3>
          <p className="text-xs text-muted-foreground">New challenges added monthly</p>
        </div>
      </div>
    </div>
  )
}
