import { useCompetitionAwards } from '../../hooks/useCompetitionAwards'
import { Trophy, Scale, Ruler, Hash, Palette, Camera } from 'lucide-react'
import type { AwardCategory } from '../../types'

interface CompetitionAwardsCardProps {
  competitionId: string
}

const CATEGORY_INFO: Record<AwardCategory, { label: string; icon: React.ReactNode; color: string }> = {
  heaviest_total: {
    label: 'Heaviest Total',
    icon: <Scale size={16} />,
    color: 'bg-amber-100 text-amber-700',
  },
  biggest_single: {
    label: 'Biggest Fish',
    icon: <Trophy size={16} />,
    color: 'bg-yellow-100 text-yellow-700',
  },
  longest_fish: {
    label: 'Longest Fish',
    icon: <Ruler size={16} />,
    color: 'bg-blue-100 text-blue-700',
  },
  most_catches: {
    label: 'Most Catches',
    icon: <Hash size={16} />,
    color: 'bg-emerald-100 text-emerald-700',
  },
  species_diversity: {
    label: 'Species Diversity',
    icon: <Palette size={16} />,
    color: 'bg-purple-100 text-purple-700',
  },
  photo_contest: {
    label: 'Best Photo',
    icon: <Camera size={16} />,
    color: 'bg-pink-100 text-pink-700',
  },
}

export function CompetitionAwardsCard({ competitionId }: CompetitionAwardsCardProps) {
  const { data: awards, isLoading } = useCompetitionAwards(competitionId)

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-12 rounded-lg bg-gray-100" />
            <div className="h-12 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }

  if (!awards || awards.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
          <Trophy size={14} className="text-amber-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-900">Award Categories</h3>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          {awards.length}
        </span>
      </div>

      <div className="space-y-2">
        {awards.map((award, index) => {
          const info = CATEGORY_INFO[award.category]
          return (
            <div
              key={award.id}
              className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${info.color}`}>
                {info.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                  <p className="text-sm font-semibold text-gray-900">{award.title}</p>
                </div>
                {award.prize && (
                  <p className="text-xs text-gray-500">🏆 {award.prize}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
