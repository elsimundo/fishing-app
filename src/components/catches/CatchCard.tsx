import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { Catch } from '../../types'

type CatchCardProps = {
  item: Catch
}

export function CatchCard({ item }: CatchCardProps) {
  const dateLabel = format(new Date(item.caught_at), 'd MMM yyyy')

  // Build stats string
  const stats: string[] = []
  if (item.weight_kg != null && item.weight_kg > 0) {
    stats.push(`${item.weight_kg.toFixed(1)} kg`)
  }
  if (item.length_cm != null && item.length_cm > 0) {
    stats.push(`${item.length_cm.toFixed(0)} cm`)
  }

  return (
    <Link to={`/catches/${item.id}`} className="block">
      <article className="rounded-xl bg-white px-4 py-3 hover:bg-gray-50 transition-colors">
        {/* Top row: species badge + date */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              🐟 Catch
            </span>
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">{dateLabel}</span>
        </div>

        {/* Title: species name */}
        <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-1 line-clamp-1">
          {item.species}
          {stats.length > 0 && (
            <span className="font-normal text-gray-500"> · {stats.join(' · ')}</span>
          )}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin size={12} className="text-red-400 flex-shrink-0" />
          <span className="line-clamp-1">{item.location_name || 'Unknown location'}</span>
        </div>
      </article>
    </Link>
  )
}
