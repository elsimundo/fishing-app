import { useNavigate } from 'react-router-dom'
import type { Competition, CompetitionEntry } from '../../types'

interface CompetitionLeaderboardProps {
  competition: Competition
  entries: CompetitionEntry[]
  isLoading: boolean
  userEntry?: CompetitionEntry | null
}

const podiumBg: Record<number, string> = {
  1: 'bg-yellow-50 border-yellow-400',
  2: 'bg-gray-50 border-gray-400',
  3: 'bg-orange-50 border-orange-400',
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
  const unit = getUnit(competition.type)

  if (isLoading) {
    return (
      <div className="mt-4 bg-white px-5 py-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Leaderboard</h2>
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="mt-4 bg-white px-5 py-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Leaderboard</h2>
        <div className="py-10 text-center">
          <div className="mb-3 text-5xl">🏆</div>
          <p className="mb-1 text-base font-semibold text-gray-900">No entries yet</p>
          <p className="text-sm text-gray-600">Be the first to compete.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 bg-white px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Leaderboard</h2>
        <span className="text-sm text-gray-600">{entries.length} entries</span>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          const isYou = entry.id === userEntry?.id
          const rank = entry.rank ?? 999
          const isPodium = rank >= 1 && rank <= 3

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => entry.session && navigate(`/sessions/${entry.session.id}`)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                isYou
                  ? 'border-2 border-navy-800 bg-navy-50'
                  : isPodium
                  ? `border-2 ${podiumBg[rank]}`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-8 text-center text-sm font-bold text-gray-600">
                {isPodium ? podiumIcon[rank] : `#${rank}`}
              </div>

              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-sm font-semibold text-white">
                {entry.user?.username?.[0]?.toUpperCase() ?? 'U'}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {entry.user?.username ?? 'Unknown'}
                  {isYou && <span className="ml-1 text-xs text-navy-800">(you)</span>}
                </p>
                {entry.session && (
                  <p className="truncate text-xs text-gray-600">{entry.session.title}</p>
                )}
              </div>

              <div className="text-right text-sm">
                <p className="text-base font-bold text-gray-900">
                  {entry.score != null ? entry.score.toFixed(2) : '0.00'}
                </p>
                <p className="text-xs text-gray-600">{unit}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
