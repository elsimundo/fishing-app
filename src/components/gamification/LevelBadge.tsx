import { getLevelTier } from '../../hooks/useGamification'

interface LevelBadgeProps {
  level: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showTier?: boolean
  className?: string
}

export function LevelBadge({ level, size = 'md', showTier = false, className = '' }: LevelBadgeProps) {
  const tier = getLevelTier(level)
  
  const tierConfig = {
    bronze: {
      bg: 'bg-gradient-to-br from-amber-400 to-amber-600',
      border: 'ring-amber-300',
      text: 'text-amber-900',
      label: 'Bronze',
    },
    silver: {
      bg: 'bg-gradient-to-br from-slate-300 to-slate-500',
      border: 'ring-slate-200',
      text: 'text-slate-800',
      label: 'Silver',
    },
    gold: {
      bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
      border: 'ring-yellow-300',
      text: 'text-yellow-900',
      label: 'Gold',
    },
    platinum: {
      bg: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
      border: 'ring-cyan-300',
      text: 'text-cyan-900',
      label: 'Platinum',
    },
    diamond: {
      bg: 'bg-gradient-to-br from-purple-400 to-purple-600',
      border: 'ring-purple-300',
      text: 'text-white',
      label: 'Diamond',
    },
  }
  
  const sizes = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }
  
  const config = tierConfig[tier]
  
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div 
        className={`
          ${sizes[size]} 
          ${config.bg} 
          ${config.text}
          rounded-full 
          flex items-center justify-center 
          font-bold 
          ring-2 ${config.border}
          shadow-sm
        `}
      >
        {level}
      </div>
      {showTier && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </div>
  )
}

// Compact inline version for use in text
export function LevelBadgeInline({ level }: { level: number }) {
  const tier = getLevelTier(level)
  
  const tierColors = {
    bronze: 'bg-amber-100 text-amber-700 border-amber-300',
    silver: 'bg-slate-100 text-slate-700 border-slate-300',
    gold: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    platinum: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    diamond: 'bg-purple-100 text-purple-700 border-purple-300',
  }
  
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${tierColors[tier]}`}>
      Lv.{level}
    </span>
  )
}
