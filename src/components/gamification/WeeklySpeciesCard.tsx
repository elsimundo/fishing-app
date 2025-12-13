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
      <div className={`bg-[#243B4A] border border-[#334155] rounded-2xl p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-[#334155] rounded w-1/2" />
          <div className="space-y-2">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="h-8 bg-[#1A2D3D] rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  const displaySpecies = speciesPoints?.slice(0, limit) || []
  const bonusSpecies = displaySpecies.find(s => s.is_bonus)
  
  return (
    <div className={`bg-[#243B4A] border border-[#334155] rounded-2xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-white">This Week's Species</h3>
        {showCountdown && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} />
            <span>{daysUntilMonday} days left</span>
          </div>
        )}
      </div>
      
      {/* Bonus species highlight */}
      {bonusSpecies && (
        <div className="mb-3 p-2 bg-amber-900/30 rounded-lg border border-amber-500/40">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-orange-400" />
            <span className="text-xs font-semibold text-orange-300">
              {bonusSpecies.bonus_reason || 'Bonus Species!'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-medium text-white capitalize">
              {bonusSpecies.species}
            </span>
            <span className="text-sm font-bold text-orange-400">
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
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#1A2D3D]"
          >
            <span className="text-sm text-gray-300 capitalize">{species.species}</span>
            <span className="text-sm font-semibold text-[#1BA9A0]">{species.points} pts</span>
          </div>
        ))}
      </div>
      
      {/* View all link */}
      {speciesPoints && speciesPoints.length > limit && (
        <button className="w-full mt-3 text-xs text-[#1BA9A0] font-medium hover:text-[#14B8A6]">
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
