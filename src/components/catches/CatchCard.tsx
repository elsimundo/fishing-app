import { format } from 'date-fns'
import type { Catch } from '../../types'

type CatchCardProps = {
  item: Catch
}

export function CatchCard({ item }: CatchCardProps) {
  const dateLabel = format(new Date(item.caught_at), 'd MMM yyyy')

  return (
    <article className="flex items-start justify-between rounded-lg border border-slate-200 bg-surface p-3 text-xs shadow-sm">
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
    </article>
  )
}
