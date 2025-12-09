import { Link } from 'react-router-dom'
import type { Catch } from '../../types'

type CatchCardProps = {
  item: Catch
}

export function CatchCard({ item }: CatchCardProps) {
  // Build stats suffix
  const stats: string[] = []
  if (item.weight_kg != null && item.weight_kg > 0) {
    stats.push(`${item.weight_kg.toFixed(1)} kg`)
  }
  if (item.length_cm != null && item.length_cm > 0) {
    stats.push(`${item.length_cm.toFixed(0)} cm`)
  }
  const statsSuffix = stats.length > 0 ? ` · ${stats.join(' · ')}` : ''

  return (
    <Link to={`/catches/${item.id}`} className="block">
      <article className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-navy-800/40">
        {/* Top row: badge + date */}
        <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
            🐟 Catch
          </span>
          <span>
            {new Date(item.caught_at).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Content row: thumbnail + details */}
        <div className="flex gap-3">
          {item.photo_url && (
            <img
              src={item.photo_url}
              alt={item.species}
              className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            {/* Title: species + stats */}
            <p className="text-sm font-semibold text-gray-900">
              {item.species}{statsSuffix}
            </p>

            {/* Location */}
            <p className="mt-0.5 text-xs text-gray-500">
              📍 {item.location_name || 'Unknown location'}
            </p>
          </div>
        </div>
      </article>
    </Link>
  )
}
