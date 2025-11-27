import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '../../types'
import { useActiveSession } from '../../hooks/useActiveSession'
import { useCatches } from '../../hooks/useCatches'

function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 'Just started'
  const diffMinutes = Math.round((end - start) / (1000 * 60))
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function getWaterTypeBadge(session: Session | null): string {
  if (!session?.water_type) return ''
  switch (session.water_type) {
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
      return session.water_type
  }
}

export function ActiveSessionBanner() {
  const { data: session, isLoading } = useActiveSession()

  const { catches } = useCatches(session?.id)

  const durationLabel = useMemo(
    () => (session ? formatDuration(session.started_at, session.ended_at) : ''),
    [session?.started_at, session?.ended_at],
  )

  if (isLoading || !session) return null

  const title = session.title || session.location_name
  const waterBadge = getWaterTypeBadge(session)

  return (
    <section className="mb-3 rounded-xl bg-surface p-3 text-xs text-slate-700 shadow">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold text-slate-900">Active session</p>
          <p className="text-sm font-medium text-slate-800">{title}</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live · {durationLabel}
            </span>
            {waterBadge ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5">{waterBadge}</span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              {catches.length} {catches.length === 1 ? 'catch' : 'catches'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link
            to={`/sessions/${session.id}`}
            className="rounded-md border border-slate-200 bg-surface px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
          >
            View session
          </Link>
        </div>
      </div>
    </section>
  )
}
