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
      <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
        <div className="p-4">
          {/* Top row: species + date */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🐟</span>
              <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.species}</p>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">{dateLabel}</span>
          </div>

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
              <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-600">
                <MapPin size={14} className="text-gray-400" />
                <span className="line-clamp-1">{item.location_name}</span>
              </div>

              {/* Stats */}
              {hasStats && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {item.weight_kg != null && item.weight_kg > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1">
                      <Scale size={13} className="text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">{item.weight_kg.toFixed(1)} kg</span>
                    </div>
                  )}
                  {item.length_cm != null && item.length_cm > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1">
                      <Ruler size={13} className="text-blue-500" />
                      <span className="text-xs font-semibold text-blue-700">{item.length_cm.toFixed(0)} cm</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bait */}
              {item.bait && (
                <p className="text-[11px] text-gray-500">🪱 {item.bait}</p>
              )}

              {/* Conditions */}
              {(item.weather_temp != null || item.weather_condition || item.wind_speed != null) && (
                <p className="mt-1 text-[11px] text-gray-500">
                  {item.weather_temp != null && `${item.weather_temp.toFixed(1)}°C`}
                  {item.weather_temp != null && (item.weather_condition || item.wind_speed != null) && ' · '}
                  {item.weather_condition && item.weather_condition}
                  {item.weather_condition && item.wind_speed != null && ' · '}
                  {item.wind_speed != null && `${item.wind_speed.toFixed(1)} mph`}
                </p>
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
            <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">
              <span>View</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
