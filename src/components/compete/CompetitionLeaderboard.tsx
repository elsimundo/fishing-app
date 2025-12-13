import { useNavigate } from 'react-router-dom'
import type { Competition, CompetitionLeaderboardEntry } from '../../types'
import { useAuth } from '../../hooks/useAuth'

interface CompetitionLeaderboardProps {
  competition: Competition
  entries: CompetitionLeaderboardEntry[]
  isLoading: boolean
  userEntry?: CompetitionLeaderboardEntry | null
}

const podiumBg: Record<number, string> = {
  1: 'bg-yellow-900/30 border-yellow-500/50',
  2: 'bg-slate-700/30 border-slate-500/50',
  3: 'bg-orange-900/30 border-orange-500/50',
}

const podiumIcon: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

function getUnit(type: Competition['type']): string {
  switch (type) {
    case 'heaviest_fish':
      return 'kg'
    case 'most_catches':
      return 'fish'
    case 'species_diversity':
      return 'species'
    case 'photo_contest':
      return 'votes'
    default:
      return 'pts'
  }
}

export function CompetitionLeaderboard({
  competition,
  entries,
  isLoading,
  userEntry,
}: CompetitionLeaderboardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const unit = getUnit(competition.type)

  if (isLoading) {
    return (
      <div className="mt-4 px-5 py-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">Leaderboard</h2>
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 rounded-full border-2 border-border border-t-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="mt-4 px-5 py-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">Leaderboard</h2>
        <div className="py-10 text-center">
          <div className="mb-3 text-5xl">🏆</div>
          <p className="mb-1 text-base font-semibold text-foreground">No entries yet</p>
          <p className="text-sm text-muted-foreground">Be the first to compete.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Leaderboard</h2>
        <span className="text-sm text-muted-foreground">{entries.length} entries</span>
      </div>

      <div className="space-y-2">
        {entries.map((entry, index) => {
          const isYou = entry.user_id === user?.id
          const rank = entry.rank ?? 999
          const isPodium = rank >= 1 && rank <= 3

          return (
            <button
              key={`${entry.user_id}-${index}`}
              type="button"
              onClick={() => entry.best_catch_id && navigate(`/catches/${entry.best_catch_id}`)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                isYou
                  ? 'border-2 border-primary bg-primary/20'
                  : isPodium
                  ? `border-2 ${podiumBg[rank]}`
                  : 'border-border hover:border-primary/50 bg-background'
              }`}
            >
              <div className="w-8 text-center text-sm font-bold text-muted-foreground">
                {isPodium ? podiumIcon[rank] : `#${rank}`}
              </div>

              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-sm font-semibold text-white">
                {entry.username?.[0]?.toUpperCase() ?? 'U'}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {entry.username ?? 'Unknown'}
                  {isYou && <span className="ml-1 text-xs text-primary">(you)</span>}
                </p>
                {entry.best_catch_species && (
                  <p className="truncate text-xs text-muted-foreground">{entry.best_catch_species}</p>
                )}
              </div>

              <div className="text-right text-sm">
                <p className="text-base font-bold text-foreground">
                  {entry.score != null ? entry.score.toFixed(2) : '0.00'}
                </p>
                <p className="text-xs text-muted-foreground">{unit}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
