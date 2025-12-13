import { useState } from 'react'
import { Plus, X, Trophy, Scale, Ruler, Hash, Palette, Camera, GripVertical } from 'lucide-react'
import type { AwardCategory } from '../../../types'

export interface AwardInput {
  id: string
  category: AwardCategory
  title: string
  prize: string
  target_species: string  // Optional: specific species this award targets
}

interface AwardsStepProps {
  data: {
    awards: AwardInput[]
  }
  onChange: (updates: Partial<{ awards: AwardInput[] }>) => void
}

const AWARD_CATEGORIES: {
  category: AwardCategory
  label: string
  description: string
  icon: React.ReactNode
  defaultTitle: string
}[] = [
  {
    category: 'heaviest_total',
    label: 'Heaviest Total Weight',
    description: 'Sum of all catch weights',
    icon: <Scale size={18} />,
    defaultTitle: 'Heaviest Total Weight',
  },
  {
    category: 'biggest_single',
    label: 'Biggest Single Fish',
    description: 'Largest individual catch by weight',
    icon: <Trophy size={18} />,
    defaultTitle: 'Biggest Single Fish',
  },
  {
    category: 'longest_fish',
    label: 'Longest Fish',
    description: 'Longest individual catch',
    icon: <Ruler size={18} />,
    defaultTitle: 'Longest Fish',
  },
  {
    category: 'most_catches',
    label: 'Most Catches',
    description: 'Total number of fish caught',
    icon: <Hash size={18} />,
    defaultTitle: 'Most Catches',
  },
  {
    category: 'species_diversity',
    label: 'Species Diversity',
    description: 'Most different species caught',
    icon: <Palette size={18} />,
    defaultTitle: 'Species Diversity',
  },
  {
    category: 'photo_contest',
    label: 'Best Photo',
    description: 'Best catch photo (judged)',
    icon: <Camera size={18} />,
    defaultTitle: 'Best Photo',
  },
]

export function AwardsStep({ data, onChange }: AwardsStepProps) {
  const generateId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    // Fallback for browsers without crypto.randomUUID
    return `award-${Math.random().toString(36).slice(2)}`
  }

  // Show picker by default when no awards exist
  const [showPicker, setShowPicker] = useState(data.awards.length === 0)

  const addAward = (category: AwardCategory) => {
    const categoryInfo = AWARD_CATEGORIES.find((c) => c.category === category)
    if (!categoryInfo) return

    const newAward: AwardInput = {
      id: generateId(),
      category,
      title: categoryInfo.defaultTitle,
      prize: '',
      target_species: '',
    }

    onChange({ awards: [...data.awards, newAward] })
    setShowPicker(false)
  }

  const removeAward = (id: string) => {
    onChange({ awards: data.awards.filter((a) => a.id !== id) })
  }

  const updateAward = (id: string, updates: Partial<AwardInput>) => {
    onChange({
      awards: data.awards.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })
  }

  const getCategoryInfo = (category: AwardCategory) => {
    return AWARD_CATEGORIES.find((c) => c.category === category)
  }

  // Categories not yet added
  const availableCategories = AWARD_CATEGORIES.filter(
    (c) => !data.awards.some((a) => a.category === c.category)
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Award Categories</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add one or more award categories for your competition
        </p>
      </div>

      {/* Current Awards */}
      {data.awards.length > 0 ? (
        <div className="space-y-3">
          {data.awards.map((award, index) => {
            const info = getCategoryInfo(award.category)
            return (
              <div
                key={award.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-900/30 text-amber-400">
                    {info?.icon}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical size={16} className="text-muted-foreground" />
                        <span className="text-xs font-semibold text-amber-400">
                          #{index + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAward(award.id)}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-red-400"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Award Title
                      </label>
                      <input
                        type="text"
                        value={award.title}
                        onChange={(e) => updateAward(award.id, { title: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder={info?.defaultTitle}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Target Species (optional)
                      </label>
                      <input
                        type="text"
                        value={award.target_species}
                        onChange={(e) => {
                          const species = e.target.value
                          updateAward(award.id, { target_species: species })
                          // Auto-update title if species is set
                          if (species && info) {
                            const baseTitle = info.label.replace('Fish', '').replace('Single', '').trim()
                            updateAward(award.id, { 
                              target_species: species,
                              title: `${baseTitle} ${species}`.trim()
                            })
                          }
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. Smoothhound, Cod, Skate"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Leave empty for any species, or enter a specific species name
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Prize (optional)
                      </label>
                      <input
                        type="text"
                        value={award.prize}
                        onChange={(e) => updateAward(award.id, { prize: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. £50 tackle voucher, Trophy"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {info?.description}
                      {award.target_species && (
                        <span className="ml-1 font-medium text-amber-400">
                          • Only {award.target_species} catches count
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border bg-background p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Trophy size={24} className="text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">No awards added yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add at least one award category to your competition
          </p>
        </div>
      )}

      {/* Add Award Button / Picker */}
      {availableCategories.length > 0 && (
        <>
          {showPicker ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Select Award Category</p>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid gap-2">
                {availableCategories.map((cat) => (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => addAward(cat.category)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-amber-500/40 hover:bg-amber-900/20"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-900/30 text-amber-400">
                      {cat.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-500/40 hover:bg-amber-900/20 hover:text-amber-400"
            >
              <Plus size={18} />
              <span>Add Award Category</span>
            </button>
          )}
        </>
      )}

      {/* Validation hint */}
      {data.awards.length === 0 && (
        <p className="text-center text-xs text-amber-400">
          ⚠️ Add at least one award category to continue
        </p>
      )}
    </div>
  )
}
