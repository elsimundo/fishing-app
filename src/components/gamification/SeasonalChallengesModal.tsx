import { X } from 'lucide-react'
import { ChallengeCard } from './ChallengeCard'
import { getSeasonTheme } from '../../utils/seasonalChallenges'
import type { Challenge, UserChallenge } from '../../hooks/useGamification'

interface SeasonalChallengesModalProps {
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'special'
  challenges: Challenge[]
  userProgressMap: Map<string, UserChallenge>
  onClose: () => void
  onChallengeClick: (slug: string) => void
}

export function SeasonalChallengesModal({
  season,
  challenges,
  userProgressMap,
  onClose,
  onChallengeClick,
}: SeasonalChallengesModalProps) {
  const theme = getSeasonTheme(season)
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`${theme.bgColor} border-b-2 border-${theme.color}-200 dark:border-${theme.color}-500/40 p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{theme.icon}</span>
              <div>
                <h2 className={`text-2xl font-bold ${theme.textColor}`}>
                  {theme.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {theme.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={24} className="text-muted-foreground" />
            </button>
          </div>
          
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className={`px-3 py-1 rounded-full ${theme.bgColor} border border-${theme.color}-200 dark:border-${theme.color}-500/40`}>
              <span className={`font-semibold ${theme.textColor}`}>
                {challenges.length} {challenges.length === 1 ? 'Challenge' : 'Challenges'}
              </span>
            </div>
            <div className="text-muted-foreground">
              {challenges.filter(c => userProgressMap.get(c.id)?.completed_at).length} completed
            </div>
          </div>
        </div>
        
        {/* Challenges List */}
        <div className="flex-1 overflow-y-auto p-6">
          {challenges.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No challenges available for this season</p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((challenge) => {
                const userProgress = userProgressMap.get(challenge.id)
                return (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    userProgress={userProgress}
                    onClick={() => {
                      onChallengeClick(challenge.slug)
                      onClose()
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
