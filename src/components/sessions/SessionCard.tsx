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
  const isCompetition = Boolean(session.competition_id)

   const coverPhotoUrl = session.cover_photo_url || (biggest && (biggest as any).photo_url) || null

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="block rounded-2xl bg-white p-4 shadow-sm border border-slate-100 active:bg-slate-50 transition-all"
    >
      <div className="flex items-start gap-4">
        {coverPhotoUrl ? (
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
            <img
              src={coverPhotoUrl}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span className="text-3xl">🎣</span>
          </div>
        )}

        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-base font-bold text-slate-900 truncate">{title}</p>
              {isCompetition && (
                <span className="text-base flex-shrink-0">🏆</span>
              )}
            </div>
            <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              isCompetition 
                ? 'bg-yellow-100 text-yellow-800' 
                : isCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {isCompleted ? 'Completed' : 'Active'}
            </span>
          </div>
          
          <p className="text-sm text-slate-500 mt-1">{rangeLabel}</p>
          
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              ⏱ {durationLabel}
            </span>
            {waterBadge ? (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                {waterBadge}
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              🐟 {totalCatches} {totalCatches === 1 ? 'catch' : 'catches'}
            </span>
          </div>
          
          {biggest ? (
            <p className="mt-2 text-sm text-slate-600">
              Biggest: <span className="font-semibold">{biggest.species}</span>
              {biggest.weight_kg != null ? ` · ${biggest.weight_kg.toFixed(1)} kg` : ''}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
