import { useWeeklySpeciesPoints } from '../../hooks/useGamification'
import { Flame, Clock } from 'lucide-react'

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
      <div className={`bg-white rounded-2xl p-4 shadow-sm ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/2" />
          <div className="space-y-2">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  const displaySpecies = speciesPoints?.slice(0, limit) || []
  const bonusSpecies = displaySpecies.find(s => s.is_bonus)
  
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">This Week's Species</h3>
        {showCountdown && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} />
            <span>{daysUntilMonday} days left</span>
          </div>
        )}
      </div>
      
      {/* Bonus species highlight */}
      {bonusSpecies && (
        <div className="mb-3 p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            <span className="text-xs font-semibold text-orange-700">
              {bonusSpecies.bonus_reason || 'Bonus Species!'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-medium text-gray-900 capitalize">
              {bonusSpecies.species}
            </span>
            <span className="text-sm font-bold text-orange-600">
              {bonusSpecies.points} pts
            </span>
          </div>
        </div>
      )}
      
      {/* Species list */}
      <div className="space-y-2">
        {displaySpecies.filter(s => !s.is_bonus).map((species) => (
          <div 
            key={species.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50"
          >
            <span className="text-sm text-gray-700 capitalize">{species.species}</span>
            <span className="text-sm font-semibold text-navy-700">{species.points} pts</span>
          </div>
        ))}
      </div>
      
      {/* View all link */}
      {speciesPoints && speciesPoints.length > limit && (
        <button className="w-full mt-3 text-xs text-navy-600 font-medium hover:text-navy-800">
          View all {speciesPoints.length} species →
        </button>
      )}
    </div>
  )
}

// Compact inline version for headers
export function WeeklySpeciesBadge() {
  const { data: speciesPoints } = useWeeklySpeciesPoints()
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
