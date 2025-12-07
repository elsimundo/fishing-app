import { useState } from 'react'
import { Plus, X, Trophy, Scale, Ruler, Hash, Palette, Camera, GripVertical } from 'lucide-react'
import type { AwardCategory } from '../../../types'

export interface AwardInput {
  id: string
  category: AwardCategory
  title: string
  prize: string
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
  // Show picker by default when no awards exist
  const [showPicker, setShowPicker] = useState(data.awards.length === 0)

  const addAward = (category: AwardCategory) => {
    const categoryInfo = AWARD_CATEGORIES.find((c) => c.category === category)
    if (!categoryInfo) return

    const newAward: AwardInput = {
      id: crypto.randomUUID(),
      category,
      title: categoryInfo.defaultTitle,
      prize: '',
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
        <h2 className="text-lg font-bold text-gray-900">Award Categories</h2>
        <p className="mt-1 text-sm text-gray-500">
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
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    {info?.icon}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical size={16} className="text-gray-400" />
                        <span className="text-xs font-semibold text-amber-600">
                          #{index + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAward(award.id)}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Award Title
                      </label>
                      <input
                        type="text"
                        value={award.title}
                        onChange={(e) => updateAward(award.id, { title: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                        placeholder={info?.defaultTitle}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Prize (optional)
                      </label>
                      <input
                        type="text"
                        value={award.prize}
                        onChange={(e) => updateAward(award.id, { prize: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                        placeholder="e.g. £50 tackle voucher, Trophy"
                      />
                    </div>

                    <p className="text-xs text-gray-500">{info?.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Trophy size={24} className="text-gray-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-900">No awards added yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Add at least one award category to your competition
          </p>
        </div>
      )}

      {/* Add Award Button / Picker */}
      {availableCategories.length > 0 && (
        <>
          {showPicker ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Select Award Category</p>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-200"
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
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      {cat.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cat.label}</p>
                      <p className="text-xs text-gray-500">{cat.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-600 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
            >
              <Plus size={18} />
              <span>Add Award Category</span>
            </button>
          )}
        </>
      )}

      {/* Validation hint */}
      {data.awards.length === 0 && (
        <p className="text-center text-xs text-amber-600">
          ⚠️ Add at least one award category to continue
        </p>
      )}
    </div>
  )
}
