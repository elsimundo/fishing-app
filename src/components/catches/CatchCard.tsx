import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { MapPin, Scale, Ruler, ChevronRight } from 'lucide-react'
import type { Catch } from '../../types'

type CatchCardProps = {
  item: Catch
}

export function CatchCard({ item }: CatchCardProps) {
  const dateLabel = format(new Date(item.caught_at), 'd MMM yyyy')
  const loggedByLabel = item.logged_by?.username || item.logged_by?.full_name || null

  const hasStats = (item.weight_kg != null && item.weight_kg > 0) || (item.length_cm != null && item.length_cm > 0)

  return (
    <Link to={`/catches/${item.id}`} className="block">
      <article className="group overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]">
        {/* Colored Header */}
        <div className="bg-gradient-to-r from-sky-500 to-cyan-600 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">🐟 {item.species}</span>
            <span className="text-xs text-white/80">{dateLabel}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex gap-3">
            {/* Photo */}
            {item.photo_url && (
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                <img
                  src={item.photo_url}
                  alt={item.species}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex-1">
              {/* Location */}
              <div className="mb-2 flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin size={14} className="text-gray-400" />
                <span className="line-clamp-1">{item.location_name}</span>
              </div>

              {/* Stats */}
              {hasStats && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {item.weight_kg != null && item.weight_kg > 0 && (
                    <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5">
                      <Scale size={14} className="text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-700">{item.weight_kg.toFixed(1)} kg</span>
                    </div>
                  )}
                  {item.length_cm != null && item.length_cm > 0 && (
                    <div className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5">
                      <Ruler size={14} className="text-blue-500" />
                      <span className="text-sm font-semibold text-blue-700">{item.length_cm.toFixed(0)} cm</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bait */}
              {item.bait && (
                <p className="text-xs text-gray-500">🪱 {item.bait}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            {loggedByLabel ? (
              <span className="text-xs text-gray-500">by @{loggedByLabel}</span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-1 text-sm font-semibold text-sky-600 group-hover:text-sky-700">
              <span>View</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
