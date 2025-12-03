import type { CompetitionLocationRestriction, Competition } from '../../../types'

interface RulesStepProps {
  data: {
    allowed_species: string[]
    water_type: Competition['water_type']
    location_restriction: CompetitionLocationRestriction | null
    entry_fee: number
    max_participants: number | null
  }
  onChange: (updates: Partial<RulesStepProps['data']>) => void
}

const COMMON_SPECIES = [
  'Bass',
  'Cod',
  'Mackerel',
  'Pollock',
  'Whiting',
  'Carp',
  'Pike',
  'Perch',
  'Roach',
  'Tench',
]

export function RulesStep({ data, onChange }: RulesStepProps) {
  const toggleSpecies = (species: string) => {
    if (data.allowed_species.includes(species)) {
      onChange({ allowed_species: data.allowed_species.filter((s) => s !== species) })
    } else {
      onChange({ allowed_species: [...data.allowed_species, species] })
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">Rules</h2>
      <p className="mb-6 text-sm text-gray-600">Set simple rules so anglers know what counts.</p>

      <div className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-semibold text-gray-900">Allowed species</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {COMMON_SPECIES.map((species) => (
              <button
                key={species}
                type="button"
                onClick={() => toggleSpecies(species)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  data.allowed_species.includes(species)
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {species}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {data.allowed_species.length === 0
              ? 'All species allowed.'
              : `${data.allowed_species.length} species selected.`}
          </p>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-gray-900">Water type</label>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {(['saltwater', 'freshwater', 'any'] as Competition['water_type'][]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ water_type: type })}
                className={`rounded-xl border-2 px-4 py-3 font-medium capitalize transition-all ${
                  data.water_type === type
                    ? 'border-navy-800 bg-navy-50 text-navy-900'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">Entry fee (£)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={data.entry_fee}
            onChange={(e) =>
              onChange({ entry_fee: Number.isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value) })
            }
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">Set to 0 for free entry.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">Max participants</label>
          <input
            type="number"
            min={1}
            value={data.max_participants ?? ''}
            onChange={(e) =>
              onChange({
                max_participants: e.target.value ? parseInt(e.target.value, 10) || null : null,
              })
            }
            placeholder="Unlimited"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">Leave blank for unlimited participants.</p>
        </div>
      </div>
    </div>
  )
}
