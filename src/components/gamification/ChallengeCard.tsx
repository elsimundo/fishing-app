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
    easy: { color: 'text-green-600', bg: 'bg-green-100', label: 'Easy' },
    medium: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Medium' },
    hard: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Hard' },
    expert: { color: 'text-red-600', bg: 'bg-red-100', label: 'Expert' },
    legendary: { color: 'text-purple-600', bg: 'bg-purple-100', label: 'Legendary' },
  }
  
  const difficulty = difficultyConfig[challenge.difficulty] || difficultyConfig.medium
  
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          flex items-center gap-2 p-2 rounded-lg border transition-all
          ${isCompleted 
            ? 'bg-green-50 border-green-200' 
            : 'bg-white border-gray-200 hover:border-gray-300'
          }
        `}
      >
        <span className="text-xl">{challenge.icon}</span>
        <div className="flex-1 text-left">
          <p className={`text-xs font-medium ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
            {challenge.title}
          </p>
        </div>
        {isCompleted && <Check size={14} className="text-green-600" />}
      </button>
    )
  }
  
  return (
    <button
      onClick={onClick}
      className={`
        relative w-full p-4 rounded-xl border-2 transition-all text-left
        ${isCompleted 
          ? 'bg-green-50 border-green-300 shadow-sm' 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
      `}
    >
      {/* Featured badge */}
      {challenge.is_featured && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1">
          <Star size={12} fill="currentColor" />
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center text-2xl
          ${isCompleted ? 'bg-green-100' : 'bg-gray-100'}
        `}>
          {challenge.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold truncate ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
              {challenge.title}
            </h3>
            {isCompleted && (
              <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {challenge.description}
          </p>
        </div>
      </div>
      
      {/* Progress bar (if not completed and has progress) */}
      {!isCompleted && target > 1 && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>{progress} / {target}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-navy-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${difficulty.bg} ${difficulty.color}`}>
          {difficulty.label}
        </span>
        
        <span className={`text-xs font-semibold ${isCompleted ? 'text-green-600' : 'text-amber-600'}`}>
          {isCompleted ? '✓ Completed' : `+${challenge.xp_reward} XP`}
        </span>
      </div>
    </button>
  )
}

// Locked challenge placeholder
export function LockedChallengeCard() {
  return (
    <div className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
      <div className="flex items-center gap-3 opacity-50">
        <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
          <Lock size={20} className="text-gray-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-400">Coming Soon</h3>
          <p className="text-xs text-gray-400">New challenges added monthly</p>
        </div>
      </div>
    </div>
  )
}
