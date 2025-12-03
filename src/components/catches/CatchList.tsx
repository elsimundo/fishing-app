import { Link } from 'react-router-dom'
import { useCatches } from '../../hooks/useCatches'
import { CatchCard } from './CatchCard'

export function CatchList() {
  const { catches, isLoading, isError, error } = useCatches()

  if (isLoading) {
    return (
      <div className="space-y-2 text-sm text-slate-500">
        <p>Loading catches…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
        Failed to load catches: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  if (!catches.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-surface p-4 text-sm text-slate-500">
        No catches yet — log your first catch from the logbook.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {catches.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-2 rounded-xl bg-surface p-2 text-xs text-slate-700 shadow-sm"
        >
          <div className="flex-1">
            <CatchCard item={item} />
          </div>
          <div className="pl-1 pt-1">
            <Link
              to={`/catches/${item.id}?share=1`}
              className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Share
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
