import { Trophy, Crown } from 'lucide-react'
import { useCompetitionWinners } from '../../hooks/useCompetitionWinners'

interface WinnersDisplayProps {
  competitionId: string
  isOrganizer?: boolean
}

export function WinnersDisplay({ competitionId, isOrganizer }: WinnersDisplayProps) {
  const { data: winners, isLoading } = useCompetitionWinners(competitionId)

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading winners...</div>
  }

  if (!winners || winners.length === 0) {
    return isOrganizer ? (
      <div className="text-center py-8">
        <Trophy size={48} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-semibold">No winners declared yet</p>
        <p className="text-sm text-muted-foreground">Declare winners once competition ends</p>
      </div>
    ) : null
  }

  // Group winners by category
  const winnersByCategory = winners.reduce(
    (acc, winner) => {
      if (!acc[winner.category]) {
        acc[winner.category] = []
      }
      acc[winner.category].push(winner)
      return acc
    },
    {} as Record<string, typeof winners>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Crown size={24} className="text-yellow-500" />
        <h2 className="text-xl font-bold text-foreground">Winners</h2>
      </div>

      {Object.entries(winnersByCategory).map(([category, categoryWinners]) => (
        <div key={category} className="bg-amber-900/30 border-2 border-amber-500/40 rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3 capitalize">
            {category.replace(/_/g, ' ')}
          </h3>

          <div className="space-y-2">
            {categoryWinners.map((winner) => (
              <div key={winner.id} className="flex items-center gap-3 bg-card rounded-lg p-3">
                {/* Avatar */}
                {winner.user.avatar_url ? (
                  <img
                    src={winner.user.avatar_url}
                    alt={winner.user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                    {winner.user.username[0].toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1">
                  <p className="font-semibold text-foreground">@{winner.user.username}</p>
                  {winner.notes && <p className="text-xs text-muted-foreground mt-0.5">{winner.notes}</p>}
                </div>

                {/* Trophy */}
                <Trophy size={20} className="text-yellow-500" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
