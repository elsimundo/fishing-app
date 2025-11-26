import { CatchCard } from './CatchCard'
import { useCatches } from '../../hooks/useCatches'

export function CatchList() {
  const { catches, isLoading, isError, error } = useCatches()

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

  return (
    <div className="space-y-2">
      {catches.map((item) => (
        <CatchCard key={item.id} item={item} />
      ))}
    </div>
  )
}
