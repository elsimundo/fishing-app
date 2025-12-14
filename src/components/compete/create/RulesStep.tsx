import { useEffect, useMemo, useState } from 'react'
import type { CompetitionLocationRestriction, Competition } from '../../../types'
import { FISH_SPECIES } from '../../../lib/constants'

interface RulesStepProps {
  data: {
    allowed_species: string[]
    water_type: Exclude<Competition['water_type'], null>
    location_restriction: CompetitionLocationRestriction | null
    entry_fee: number
    max_participants: number | null
  }
  onChange: (updates: Partial<RulesStepProps['data']>) => void
}

export function RulesStep({ data, onChange }: RulesStepProps) {
  const [selectedSpeciesToAdd, setSelectedSpeciesToAdd] = useState('')

  const getAvailableSpecies = (waterType: Exclude<Competition['water_type'], null>): string[] => {
    if (waterType === 'saltwater') return [...FISH_SPECIES.SALTWATER]
    if (waterType === 'freshwater') return [...FISH_SPECIES.COARSE, ...FISH_SPECIES.GAME]
    return [...FISH_SPECIES.SALTWATER, ...FISH_SPECIES.COARSE, ...FISH_SPECIES.GAME]
  }

  const availableSpecies = getAvailableSpecies(data.water_type)

  useEffect(() => {
    if (data.allowed_species.length > 0) return
    if (availableSpecies.length === 0) return
    onChange({ allowed_species: [availableSpecies[0]] })
  }, [availableSpecies, data.allowed_species.length, onChange])

  const selectableSpecies = useMemo(() => {
    const set = new Set<string>(availableSpecies)
    data.allowed_species.forEach((s) => set.delete(s))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [availableSpecies, data.allowed_species])

  const removeSpecies = (species: string) => {
    if (data.allowed_species.length <= 1) return
    onChange({ allowed_species: data.allowed_species.filter((s) => s !== species) })
  }

  const addSpecies = (species: string) => {
    const trimmed = species.trim()
    if (!trimmed) return
    if (data.allowed_species.includes(trimmed)) return
    onChange({ allowed_species: [...data.allowed_species, trimmed] })
  }

  const handleWaterTypeChange = (type: Exclude<Competition['water_type'], null>) => {
    const nextAvailable = getAvailableSpecies(type)

    let nextAllowed = data.allowed_species.filter((s) => nextAvailable.includes(s))
    if (nextAllowed.length === 0 && nextAvailable.length > 0) {
      nextAllowed = [nextAvailable[0]]
    }
    onChange({ water_type: type, allowed_species: nextAllowed })
    setSelectedSpeciesToAdd('')
  }

  const handleAddSelected = () => {
    if (!selectedSpeciesToAdd) return
    addSpecies(selectedSpeciesToAdd)
    setSelectedSpeciesToAdd('')
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-foreground">Rules</h2>
      <p className="mb-6 text-sm text-muted-foreground">Set simple rules so anglers know what counts.</p>

      <div className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-semibold text-foreground">Allowed species</label>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <select
                value={selectedSpeciesToAdd}
                onChange={(e) => setSelectedSpeciesToAdd(e.target.value)}
                className="flex-1 rounded-xl border-2 border-border bg-background px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
              >
                <option value="">Select a species…</option>
                {selectableSpecies.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddSelected}
                disabled={!selectedSpeciesToAdd}
                className="rounded-xl border-2 border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.allowed_species.map((species) => (
                <span
                  key={species}
                  className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {species}
                  <button
                    type="button"
                    onClick={() => removeSpecies(species)}
                    disabled={data.allowed_species.length <= 1}
                    className="rounded-full px-1 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40"
                    aria-label={`Remove ${species}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Select at least 1 species. You can add as many as you like.
          </p>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-foreground">Water type</label>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {(['saltwater', 'freshwater', 'any'] as Exclude<Competition['water_type'], null>[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleWaterTypeChange(type)}
                className={`rounded-xl border-2 px-4 py-3 font-medium capitalize transition-all ${
                  data.water_type === type
                    ? 'border-navy-800 bg-navy-50 text-navy-900'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Entry fee (£)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={data.entry_fee}
            onChange={(e) =>
              onChange({ entry_fee: Number.isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value) })
            }
            className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">Set to 0 for free entry.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Max participants</label>
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
            className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">Leave blank for unlimited participants.</p>
        </div>
      </div>
    </div>
  )
}
