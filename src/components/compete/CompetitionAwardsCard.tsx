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
    color: 'bg-amber-900/30 text-amber-400',
  },
  biggest_single: {
    label: 'Biggest Fish',
    icon: <Trophy size={16} />,
    color: 'bg-yellow-900/30 text-yellow-400',
  },
  longest_fish: {
    label: 'Longest Fish',
    icon: <Ruler size={16} />,
    color: 'bg-blue-900/30 text-blue-400',
  },
  most_catches: {
    label: 'Most Catches',
    icon: <Hash size={16} />,
    color: 'bg-emerald-900/30 text-emerald-400',
  },
  species_diversity: {
    label: 'Species Diversity',
    icon: <Palette size={16} />,
    color: 'bg-purple-900/30 text-purple-400',
  },
  photo_contest: {
    label: 'Best Photo',
    icon: <Camera size={16} />,
    color: 'bg-pink-900/30 text-pink-400',
  },
}

export function CompetitionAwardsCard({ competitionId }: CompetitionAwardsCardProps) {
  const { data: awards, isLoading } = useCompetitionAwards(competitionId)

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-3 h-4 w-24 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-12 rounded-lg bg-background" />
            <div className="h-12 rounded-lg bg-background" />
          </div>
        </div>
      </div>
    )
  }

  if (!awards || awards.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-900/30">
          <Trophy size={14} className="text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Award Categories</h3>
        <span className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-400">
          {awards.length}
        </span>
      </div>

      <div className="space-y-2">
        {awards.map((award, index) => {
          const info = CATEGORY_INFO[award.category]
          return (
            <div
              key={award.id}
              className="flex items-center gap-3 rounded-xl bg-background p-3"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${info.color}`}>
                {info.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                  <p className="text-sm font-semibold text-foreground">{award.title}</p>
                  {award.target_species && (
                    <span className="rounded-full bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                      🐟 {award.target_species}
                    </span>
                  )}
                </div>
                {award.prize && (
                  <p className="text-xs text-muted-foreground">🏆 {award.prize}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
