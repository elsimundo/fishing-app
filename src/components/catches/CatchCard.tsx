import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import type { Catch } from '../../types'

type CatchCardProps = {
  item: Catch
}

export function CatchCard({ item }: CatchCardProps) {
  const dateLabel = format(new Date(item.caught_at), 'd MMM yyyy')

  return (
    <Link to={`/catches/${item.id}`} className="block">
      <article className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-xs shadow-sm transition-shadow hover:shadow-md">
        {item.photo_url ? (
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
            <img
              src={item.photo_url}
              alt={item.species}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="flex flex-1 items-start justify-between space-x-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">{item.species}</h3>
            <p className="text-[11px] text-slate-600">{item.location_name}</p>
            <p className="text-[11px] text-slate-500">{dateLabel}</p>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            {item.weight_kg != null && item.weight_kg > 0 ? (
              <p className="font-medium">{item.weight_kg.toFixed(1)} kg</p>
            ) : null}
            {item.length_cm != null && item.length_cm > 0 ? (
              <p>{item.length_cm.toFixed(0)} cm</p>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  )
}
