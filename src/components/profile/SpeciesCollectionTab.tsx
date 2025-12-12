import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fish, ChevronRight, Trophy, Scale, Ruler } from 'lucide-react'
import type { Catch } from '../../types'

interface SpeciesStats {
  species: string
  count: number
  bestCatch: Catch
  totalWeight: number
}

interface SpeciesCollectionTabProps {
  catches: Catch[]
}

export function SpeciesCollectionTab({ catches }: SpeciesCollectionTabProps) {
  const navigate = useNavigate()
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null)

  // Calculate species stats
  const speciesMap = new Map<string, { catches: Catch[]; totalWeight: number }>()
  
  for (const c of catches) {
    if (!c.species) continue
    
    const existing = speciesMap.get(c.species) || { catches: [], totalWeight: 0 }
    existing.catches.push(c)
    existing.totalWeight += c.weight_kg || 0
    speciesMap.set(c.species, existing)
  }

  // Convert to sorted array with best catch per species
  const speciesStats: SpeciesStats[] = Array.from(speciesMap.entries())
    .map(([species, data]) => {
      // Find the best catch (heaviest, or longest if no weight)
      const bestCatch = data.catches.reduce((best, current) => {
        const currentWeight = current.weight_kg || 0
        const bestWeight = best.weight_kg || 0
        if (currentWeight > bestWeight) return current
        if (currentWeight === bestWeight && (current.length_cm || 0) > (best.length_cm || 0)) return current
        return best
      }, data.catches[0])

      return {
        species,
        count: data.catches.length,
        bestCatch,
        totalWeight: data.totalWeight,
      }
    })
    .sort((a, b) => b.count - a.count) // Sort by count descending

  // Get catches for selected species
  const selectedSpeciesCatches = selectedSpecies
    ? speciesMap.get(selectedSpecies)?.catches.sort((a, b) => {
        // Sort by weight descending
        const weightA = a.weight_kg || 0
        const weightB = b.weight_kg || 0
        return weightB - weightA
      }) || []
    : []

  if (catches.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        <Fish className="mx-auto mb-2 h-10 w-10 text-gray-300" />
        <p className="mb-1 font-medium text-gray-900">No species caught yet</p>
        <p className="text-xs text-gray-500">Log your first catch to start building your collection.</p>
      </div>
    )
  }

  // Species detail view
  if (selectedSpecies) {
    const stats = speciesStats.find(s => s.species === selectedSpecies)
    if (!stats) return null

    return (
      <div>
        {/* Back button */}
        <button
          type="button"
          onClick={() => setSelectedSpecies(null)}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800"
        >
          ← Back to collection
        </button>

        {/* Species header */}
        <div className="mb-4 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 text-3xl">
              🐟
            </div>
            <div>
              <h3 className="text-xl font-bold">{selectedSpecies}</h3>
              <p className="text-sm text-cyan-100">
                {stats.count} {stats.count === 1 ? 'catch' : 'catches'} · {stats.totalWeight.toFixed(1)} kg total
              </p>
            </div>
          </div>
        </div>

        {/* Personal best highlight */}
        <div className="mb-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">Personal Best</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/catches/${stats.bestCatch.id}`)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                {stats.bestCatch.weight_kg && (
                  <p className="text-lg font-bold text-amber-900">
                    {stats.bestCatch.weight_kg.toFixed(2)} kg
                  </p>
                )}
                {stats.bestCatch.length_cm && (
                  <p className="text-sm text-amber-700">
                    {stats.bestCatch.length_cm} cm
                  </p>
                )}
                <p className="mt-1 text-xs text-amber-600">
                  {new Date(stats.bestCatch.caught_at).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {stats.bestCatch.photo_url && (
                <img
                  src={stats.bestCatch.photo_url}
                  alt={selectedSpecies}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              )}
            </div>
          </button>
        </div>

        {/* All catches for this species */}
        <h4 className="mb-2 text-sm font-semibold text-gray-900">All Catches</h4>
        <div className="space-y-2">
          {selectedSpeciesCatches.map((c, index) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/catches/${c.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-gray-300"
            >
              {c.photo_url ? (
                <img
                  src={c.photo_url}
                  alt={c.species}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl">
                  🐟
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {index === 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      PB
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {c.weight_kg ? `${c.weight_kg.toFixed(2)} kg` : 'No weight'}
                    {c.length_cm ? ` · ${c.length_cm} cm` : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(c.caught_at).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Main species grid view
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">
          {speciesStats.length} {speciesStats.length === 1 ? 'species' : 'species'} caught
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {speciesStats.map((stats) => (
          <button
            key={stats.species}
            type="button"
            onClick={() => setSelectedSpecies(stats.species)}
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-cyan-300 hover:shadow-md"
          >
            {/* Photo or placeholder */}
            {stats.bestCatch.photo_url ? (
              <div className="relative mb-2 h-24 w-full overflow-hidden rounded-lg">
                <img
                  src={stats.bestCatch.photo_url}
                  alt={stats.species}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-1 right-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                  {stats.count}×
                </div>
              </div>
            ) : (
              <div className="relative mb-2 flex h-24 w-full items-center justify-center rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50">
                <span className="text-4xl">🐟</span>
                <div className="absolute bottom-1 right-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                  {stats.count}×
                </div>
              </div>
            )}

            {/* Species name */}
            <p className="truncate text-sm font-semibold text-gray-900">{stats.species}</p>

            {/* Best catch stats */}
            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
              {stats.bestCatch.weight_kg && (
                <span className="flex items-center gap-0.5">
                  <Scale size={10} />
                  {stats.bestCatch.weight_kg.toFixed(1)} kg
                </span>
              )}
              {stats.bestCatch.length_cm && (
                <span className="flex items-center gap-0.5">
                  <Ruler size={10} />
                  {stats.bestCatch.length_cm} cm
                </span>
              )}
            </div>

            {/* PB indicator */}
            <div className="absolute right-2 top-2">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
