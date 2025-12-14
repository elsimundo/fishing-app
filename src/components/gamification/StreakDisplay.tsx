import { Flame, Snowflake, Calendar } from 'lucide-react'

interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
  lastActivityDate?: string | null
  freezesAvailable?: number
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  className?: string
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  lastActivityDate,
  freezesAvailable = 0,
  size = 'md',
  showDetails = false,
  className = '',
}: StreakDisplayProps) {
  const isActiveToday = lastActivityDate === new Date().toISOString().split('T')[0]
  const isAtRisk = !isActiveToday && currentStreak > 0
  
  const sizeConfig = {
    sm: {
      container: 'px-2 py-1',
      icon: 14,
      text: 'text-sm',
      subtext: 'text-[10px]',
    },
    md: {
      container: 'px-3 py-2',
      icon: 18,
      text: 'text-base',
      subtext: 'text-xs',
    },
    lg: {
      container: 'px-4 py-3',
      icon: 24,
      text: 'text-xl',
      subtext: 'text-sm',
    },
  }
  
  const config = sizeConfig[size]
  
  // Streak color based on length
  const getStreakColor = () => {
    if (currentStreak >= 100) return 'text-purple-400'
    if (currentStreak >= 30) return 'text-amber-400'
    if (currentStreak >= 7) return 'text-orange-400'
    return 'text-red-400'
  }
  
  const getStreakBg = () => {
    if (currentStreak >= 100) return 'bg-purple-500/20 border-purple-500/40'
    if (currentStreak >= 30) return 'bg-amber-500/20 border-amber-500/40'
    if (currentStreak >= 7) return 'bg-orange-500/20 border-orange-500/40'
    return 'bg-red-500/20 border-red-500/40'
  }

  if (currentStreak === 0 && !showDetails) {
    return null
  }

  return (
    <div className={`${className}`}>
      <div className={`
        inline-flex items-center gap-2 rounded-xl border
        ${currentStreak > 0 ? getStreakBg() : 'bg-muted border-border'}
        ${config.container}
      `}>
        <div className={`${currentStreak > 0 ? 'animate-streak-fire' : ''}`}>
          <Flame 
            size={config.icon} 
            className={currentStreak > 0 ? getStreakColor() : 'text-muted-foreground'} 
            fill={currentStreak > 0 ? 'currentColor' : 'none'}
          />
        </div>
        
        <div className="flex flex-col">
          <span className={`font-bold ${config.text} ${currentStreak > 0 ? getStreakColor() : 'text-muted-foreground'}`}>
            {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </span>
          {showDetails && (
            <span className={`${config.subtext} text-muted-foreground`}>
              Best: {longestStreak} days
            </span>
          )}
        </div>
        
        {isAtRisk && (
          <div className="ml-1 flex items-center gap-1 rounded-full bg-amber-500/30 px-2 py-0.5">
            <span className="text-[10px] font-semibold text-amber-400">At risk!</span>
          </div>
        )}
        
        {freezesAvailable > 0 && showDetails && (
          <div className="ml-1 flex items-center gap-1">
            <Snowflake size={12} className="text-cyan-400" />
            <span className="text-[10px] text-cyan-400">{freezesAvailable}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Compact inline version for headers
export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null
  
  const getColor = () => {
    if (streak >= 100) return 'bg-purple-500/20 text-purple-400 border-purple-500/40'
    if (streak >= 30) return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    if (streak >= 7) return 'bg-orange-500/20 text-orange-400 border-orange-500/40'
    return 'bg-red-500/20 text-red-400 border-red-500/40'
  }
  
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${getColor()}`}>
      <Flame size={12} fill="currentColor" />
      <span className="text-xs font-bold">{streak}</span>
    </div>
  )
}

// Week calendar showing streak days
export function StreakCalendar({ 
  currentStreak, 
  lastActivityDate 
}: { 
  currentStreak: number
  lastActivityDate?: string | null 
}) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  // Get days of current week (Mon-Sun)
  const weekDays: { date: Date; label: string; isActive: boolean; isToday: boolean }[] = []
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + mondayOffset + i)
    const dateStr = date.toISOString().split('T')[0]
    
    // Calculate if this day is within the streak
    const daysFromToday = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    const isActive = daysFromToday >= 0 && daysFromToday < currentStreak
    
    weekDays.push({
      date,
      label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
      isActive,
      isToday: dateStr === todayStr,
    })
  }
  
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-orange-400" fill="currentColor" />
          <span className="text-sm font-semibold text-foreground">{currentStreak} Day Streak</span>
        </div>
        <Calendar size={14} className="text-muted-foreground" />
      </div>
      
      <div className="flex justify-between gap-1">
        {weekDays.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{day.label}</span>
            <div className={`
              flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold
              ${day.isActive 
                ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white' 
                : day.isToday 
                ? 'border-2 border-dashed border-orange-400/50 text-muted-foreground'
                : 'bg-muted text-muted-foreground'
              }
            `}>
              {day.isActive ? '✓' : day.date.getDate()}
            </div>
          </div>
        ))}
      </div>
      
      {currentStreak > 0 && lastActivityDate !== todayStr && (
        <p className="mt-2 text-center text-[10px] text-amber-400">
          🔥 Log a catch or session today to keep your streak!
        </p>
      )}
    </div>
  )
}
