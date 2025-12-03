import type { CompetitionType } from '../../../types'

interface CompetitionTypeStepProps {
  selected: CompetitionType | null
  onSelect: (type: CompetitionType) => void
}

const TYPES: { id: CompetitionType; emoji: string; title: string; description: string }[] = [
  {
    id: 'heaviest_fish',
    emoji: '⚖️',
    title: 'Heaviest fish',
    description: 'Single heaviest catch wins. Perfect for trophy hunting.',
  },
  {
    id: 'most_catches',
    emoji: '🔢',
    title: 'Most catches',
    description: 'Most fish caught wins. Quantity over quality.',
  },
  {
    id: 'species_diversity',
    emoji: '🌈',
    title: 'Species diversity',
    description: 'Most different species wins. Encourages exploration.',
  },
  {
    id: 'photo_contest',
    emoji: '📸',
    title: 'Photo contest',
    description: 'Best photo wins. Community votes.',
  },
]

export function CompetitionTypeStep({ selected, onSelect }: CompetitionTypeStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">Choose competition type</h2>
      <p className="mb-6 text-sm text-gray-600">Select the format that best fits your challenge.</p>

      <div className="space-y-3">
        {TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelect(type.id)}
            className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
              selected === type.id
                ? 'border-navy-800 bg-navy-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">
              {type.emoji}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{type.title}</p>
              <p className="text-xs text-gray-600">{type.description}</p>
            </div>
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                selected === type.id ? 'border-navy-800 bg-navy-800' : 'border-gray-300'
              }`}
            >
              {selected === type.id && (
                <span className="text-[10px] font-bold text-white">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
