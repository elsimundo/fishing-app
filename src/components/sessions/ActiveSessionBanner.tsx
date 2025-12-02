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
    <section className="mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-xs text-white shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100">Active session</p>
          <p className="text-base font-semibold text-white">{title}</p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live · {durationLabel}
            </span>
            {waterBadge ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">{waterBadge}</span>
            ) : null}
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">
              {catches.length} {catches.length === 1 ? 'catch' : 'catches'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link
            to={`/sessions/${session.id}`}
            className="rounded-full border border-white/70 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm transition-transform hover:scale-105 hover:bg-white/20"
          >
            View
          </Link>
        </div>
      </div>
    </section>
  )
}
