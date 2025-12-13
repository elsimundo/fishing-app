import type { Competition, CompetitionEntry } from '../../types'

interface CompetitionHeroProps {
  competition: Competition
  userEntry?: CompetitionEntry | null
}

const typeLabels: Record<Competition['type'], { label: string; emoji: string }> = {
  heaviest_fish: { label: 'Heaviest Fish', emoji: '⚖️' },
  most_catches: { label: 'Most Catches', emoji: '🔢' },
  species_diversity: { label: 'Species Diversity', emoji: '🌈' },
  photo_contest: { label: 'Photo Contest', emoji: '📸' },
}

const statusClasses: Record<Competition['status'], string> = {
  upcoming: 'bg-blue-900/50 text-blue-300',
  active: 'bg-emerald-900/50 text-emerald-300',
  ended: 'bg-gray-700/50 text-gray-300',
  cancelled: 'bg-red-900/50 text-red-300',
}

export function CompetitionHero({ competition, userEntry }: CompetitionHeroProps) {
  const typeInfo = typeLabels[competition.type]

  return (
    <div className="relative">
      {competition.cover_image_url ? (
        <div className="h-64 overflow-hidden">
          <img
            src={competition.cover_image_url}
            alt={competition.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="h-64 bg-gradient-to-br from-navy-700 via-blue-600 to-cyan-500" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-5 text-white">
        <div className="flex flex-wrap gap-2 mb-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClasses[competition.status]}`}
          >
            {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#243B4A]/90 text-white">
            {typeInfo.emoji} {typeInfo.label}
          </span>
          {userEntry?.rank && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-gray-900">
              🏅 Your rank: #{userEntry.rank}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2 line-clamp-2">{competition.title}</h1>

        {competition.prize && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-gray-900">
            <span>🏆</span>
            <span className="line-clamp-1">{competition.prize}</span>
          </div>
        )}
      </div>
    </div>
  )
}
