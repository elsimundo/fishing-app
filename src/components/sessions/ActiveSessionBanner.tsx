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
    <section className="mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Active session</p>
          <p className="text-lg font-bold text-white">{title}</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              Live · {durationLabel}
            </span>
            {waterBadge ? (
              <span className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white">{waterBadge}</span>
            ) : null}
            <span className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white">
              🐟 {catches.length} {catches.length === 1 ? 'catch' : 'catches'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <Link
            to={`/sessions/${session.id}`}
            className="rounded-xl border-2 border-white/70 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/20 active:scale-95 min-h-[48px] flex items-center"
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
