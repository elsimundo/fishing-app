import { useUserXP, xpProgress, getLevelTier } from '../../hooks/useGamification'
import { LevelBadge } from './LevelBadge'

interface XPBarProps {
  showLevel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function XPBar({ showLevel = true, size = 'md', className = '' }: XPBarProps) {
  const { data: userData, isLoading } = useUserXP()
  
  if (isLoading || !userData) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-2 bg-gray-200 rounded-full" />
      </div>
    )
  }
  
  const { xp, level } = userData
  const progress = xpProgress(xp, level)
  const tier = getLevelTier(level)
  
  const tierColors = {
    bronze: 'from-amber-400 to-amber-600',
    silver: 'from-gray-300 to-gray-500',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-cyan-400 to-cyan-600',
    diamond: 'from-purple-400 to-purple-600',
  }
  
  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLevel && (
        <LevelBadge level={level} size={size} />
      )}
      
      <div className="flex-1">
        <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heights[size]}`}>
          <div 
            className={`h-full bg-gradient-to-r ${tierColors[tier]} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        
        {size !== 'sm' && (
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-500">
              {progress.current.toLocaleString()} / {progress.needed.toLocaleString()} XP
            </span>
            <span className="text-[10px] text-gray-500">
              Level {level + 1}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
