import { useMemo, useState } from 'react'
import { CatchCard } from './CatchCard'
import { useCatches } from '../../hooks/useCatches'

export function CatchList() {
  const { catches, isLoading, isError, error } = useCatches()
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'heaviest'>('newest')
  const [speciesFilter, setSpeciesFilter] = useState<string>('')

  if (isLoading) {
    return (
      <div className="space-y-2 text-sm text-slate-500">
        <p>Loading catches</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
        Failed to load catches: {error?.message}
      </div>
    )
  }

  if (!catches.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-surface p-4 text-sm text-slate-500">
        No catches yet  head out fishing and log your first catch!
      </div>
    )
  }

  const speciesOptions = useMemo(() => {
    const set = new Set<string>()
    catches.forEach((c) => {
      if (c.species) set.add(c.species)
    })
    return Array.from(set).sort()
  }, [catches])

  const filteredAndSortedCatches = useMemo(() => {
    let list = [...catches]

    if (speciesFilter) {
      list = list.filter((c) => c.species === speciesFilter)
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.caught_at).getTime() - new Date(a.caught_at).getTime())
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.caught_at).getTime() - new Date(b.caught_at).getTime())
    } else if (sortBy === 'heaviest') {
      list.sort((a, b) => (b.weight_kg ?? 0) - (a.weight_kg ?? 0))
    }

    return list
  }, [catches, sortBy, speciesFilter])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <div className="flex items-center gap-2">
          <span>Species:</span>
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-surface px-2 py-1 text-[11px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All</option>
            {speciesOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-md border border-slate-200 bg-surface px-2 py-1 text-[11px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="heaviest">Heaviest</option>
          </select>
        </div>
      </div>

      {filteredAndSortedCatches.map((item) => (
        <CatchCard key={item.id} item={item} />
      ))}
    </div>
  )
}
