import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '../../types'
import { useActiveSessions } from '../../hooks/useActiveSession'
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

function SessionBannerItem({ session }: { session: Session }) {
  const { catches } = useCatches(session.id)
  
  const durationLabel = useMemo(
    () => formatDuration(session.started_at, session.ended_at),
    [session.started_at, session.ended_at],
  )

  const title = session.title || session.location_name
  const waterBadge = getWaterTypeBadge(session)

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 text-xs text-slate-900 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Active session
          </p>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live · {durationLabel}
            </span>
            {waterBadge ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{waterBadge}</span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
              {catches.length} {catches.length === 1 ? 'catch' : 'catches'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link
            to={`/sessions/${session.id}`}
            className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            View
          </Link>
        </div>
      </div>
    </section>
  )
}

export function ActiveSessionBanner() {
  const { data: sessions, isLoading } = useActiveSessions()

  if (isLoading || !sessions || sessions.length === 0) return null

  return (
    <>
      {sessions.map(session => (
        <SessionBannerItem key={session.id} session={session} />
      ))}
    </>
  )
}
