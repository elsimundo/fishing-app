import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { SessionWithCatches } from '../../types'
import { getLocationPrivacyLabel } from '../../lib/privacy'

type SessionCardProps = {
  session: SessionWithCatches
}

function formatRange(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt)
  const end = endedAt ? new Date(endedAt) : null
  const day = format(start, 'd MMM yyyy')
  const startTime = format(start, 'HH:mm')
  const endTime = end ? format(end, 'HH:mm') : null
  return endTime ? `${day}, ${startTime}–${endTime}` : `${day}, ${startTime}–…`
}

function formatDurationHours(hours: number): string {
  if (hours <= 0) return 'Just started'
  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60)
  if (whole === 0) return `${minutes}m`
  if (minutes === 0) return `${whole}h`
  return `${whole}h ${minutes}m`
}

function getWaterTypeBadgeLabel(type: string | null): string | null {
  if (!type) return null
  switch (type) {
    case 'Sea/Coastal':
      return '🌊 Sea/Coastal'
    case 'River':
      return '🎣 River'
    case 'Lake/Reservoir':
      return '🏞️ Lake/Reservoir'
    case 'Canal':
      return '〰️ Canal'
    case 'Pond':
      return '⚫ Pond'
    default:
      return type
  }
}

export function SessionCard({ session }: SessionCardProps) {
  const title = session.title || session.location_name
  const rangeLabel = formatRange(session.started_at, session.ended_at)
  const durationLabel = formatDurationHours(session.stats.duration_hours)
  const waterBadge = getWaterTypeBadgeLabel(session.water_type)
  const privacyLabel = getLocationPrivacyLabel(session)

  const totalCatches = session.stats.total_catches
  const biggest = session.stats.biggest_catch

  const isCompleted = Boolean(session.ended_at)

   const coverPhotoUrl = session.cover_photo_url || (biggest && (biggest as any).photo_url) || null

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="block"
    >
      <div className="flex items-start gap-3">
        {coverPhotoUrl ? (
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
            <img
              src={coverPhotoUrl}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="flex flex-1 items-start justify-between gap-2">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-[11px] text-slate-500">{rangeLabel}</p>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
              <span className="rounded-full bg-slate-100 px-2 py-0.5">⏱ {durationLabel}</span>
              {waterBadge ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5">{waterBadge}</span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                {totalCatches} {totalCatches === 1 ? 'catch' : 'catches'}
              </span>
            </div>
            {biggest ? (
              <p className="mt-1 text-[11px] text-slate-600">
                Biggest: <span className="font-medium">{biggest.species}</span>
                {biggest.weight_kg != null ? ` · ${biggest.weight_kg.toFixed(1)} kg` : ''}
              </p>
            ) : null}
            <p className="mt-1 text-[10px] text-slate-500">{privacyLabel}</p>
          </div>
          <div className="ml-2 flex flex-col items-end gap-1">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              {isCompleted ? 'Completed' : 'Active'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
