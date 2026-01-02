import { Clock, Trophy } from 'lucide-react'
import { getCurrentSeason, getSeasonTheme, getSeasonDates, formatCountdown, getSeasonProgress } from '../../utils/seasonalChallenges'

interface SeasonalBannerProps {
  activeSeasonalChallenges?: number
  onClick?: () => void
}

export function SeasonalBanner({ activeSeasonalChallenges = 0, onClick }: SeasonalBannerProps) {
  const currentSeason = getCurrentSeason()
  const theme = getSeasonTheme(currentSeason)
  const { end } = getSeasonDates(currentSeason)
  const countdown = formatCountdown(end.toISOString())
  const progress = getSeasonProgress(currentSeason)
  
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border-2 border-${theme.color}-200 dark:border-${theme.color}-500/40 ${theme.bgColor} p-4 shadow-sm transition-all ${onClick ? 'hover:shadow-md hover:scale-[1.01] cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Season Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{theme.icon}</span>
            <h3 className={`text-lg font-bold ${theme.textColor}`}>
              {theme.name}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {theme.description}
          </p>
          
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Season Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full bg-${theme.color}-500 transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Trophy size={16} className={theme.textColor} />
            <span className="text-2xl font-bold text-foreground">{activeSeasonalChallenges}</span>
          </div>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            Active challenges
          </p>
          
          {countdown && (
            <div className={`flex items-center gap-1 text-xs font-medium ${theme.textColor}`}>
              <Clock size={12} />
              <span className="whitespace-nowrap">{countdown}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
