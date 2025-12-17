import { useWeeklySpeciesPoints } from '../../hooks/useGamification'
import { Flame, Clock } from 'lucide-react'
import { Callout, CalloutDescription, CalloutTitle } from '../ui/callout'

interface WeeklySpeciesCardProps {
  limit?: number
  showCountdown?: boolean
  waterType?: 'saltwater' | 'freshwater'
  className?: string
}

export function WeeklySpeciesCard({ limit = 5, showCountdown = true, waterType, className = '' }: WeeklySpeciesCardProps) {
  const { data: speciesPoints, isLoading } = useWeeklySpeciesPoints(waterType)
  
  // Calculate days left in week
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  
  if (isLoading) {
    return (
      <div className={`bg-card border border-border rounded-2xl p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-muted rounded w-1/2" />
          <div className="space-y-2">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="h-8 bg-background rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  const displaySpecies = speciesPoints?.slice(0, limit) || []
  const bonusSpecies = displaySpecies.find(s => s.is_bonus)
  
  return (
    <div className={`bg-card border border-border rounded-2xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground">This Week's Species</h3>
        {showCountdown && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>{daysUntilMonday} days left</span>
          </div>
        )}
      </div>
      
      {/* Bonus species highlight */}
      {bonusSpecies && (
        <div className="mb-3">
          <Callout variant="warning" className="py-2">
            <Flame />
            <CalloutTitle>{bonusSpecies.bonus_reason || 'Bonus Species!'}</CalloutTitle>
            <CalloutDescription>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{bonusSpecies.species}</span>
                <span className="text-sm font-bold">{bonusSpecies.points} pts</span>
              </div>
            </CalloutDescription>
          </Callout>
        </div>
      )}
      
      {/* Species list */}
      <div className="space-y-2">
        {displaySpecies.filter(s => !s.is_bonus).map((species) => (
          <div 
            key={species.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted">
            <span className="text-sm text-muted-foreground capitalize">{species.species}</span>
            <span className="text-sm font-semibold text-primary">{species.points} pts</span>
          </div>
        ))}
      </div>
      
      {/* View all link */}
      {speciesPoints && speciesPoints.length > limit && (
        <button className="w-full mt-3 text-xs text-primary font-medium hover:text-primary/80">
          View all {speciesPoints.length} species →
        </button>
      )}
    </div>
  )
}

// Compact inline version for headers
interface WeeklySpeciesBadgeProps {
  waterType?: 'saltwater' | 'freshwater'
}

export function WeeklySpeciesBadge({ waterType }: WeeklySpeciesBadgeProps = {}) {
  const { data: speciesPoints } = useWeeklySpeciesPoints(waterType)
  const bonusSpecies = speciesPoints?.find(s => s.is_bonus)
  
  if (!bonusSpecies) return null
  
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 rounded-full">
      <Flame size={12} className="text-orange-500" />
      <span className="text-xs font-medium text-amber-800 capitalize">
        {bonusSpecies.species}: +{bonusSpecies.points} XP
      </span>
    </div>
  )
}
