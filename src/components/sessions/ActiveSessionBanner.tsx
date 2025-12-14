import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Square, Loader2 } from 'lucide-react'
import type { Session } from '../../types'
import { useActiveSessions } from '../../hooks/useActiveSession'
import { useCatches } from '../../hooks/useCatches'
import { useUpdateSession } from '../../hooks/useUpdateSession'
import { useQueryClient } from '@tanstack/react-query'
import { WARNING_THRESHOLD_HOURS, CRITICAL_THRESHOLD_HOURS } from '../../hooks/useZombieSessions'

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

function getSessionState(startedAt: string): 'normal' | 'warning' | 'critical' {
  const start = new Date(startedAt).getTime()
  const hours = (Date.now() - start) / (1000 * 60 * 60)
  if (hours >= CRITICAL_THRESHOLD_HOURS) return 'critical'
  if (hours >= WARNING_THRESHOLD_HOURS) return 'warning'
  return 'normal'
}

function SessionBannerItem({ session }: { session: Session }) {
  const queryClient = useQueryClient()
  const { catches } = useCatches(session.id)
  const { mutateAsync: updateSession, isPending } = useUpdateSession()
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  
  const durationLabel = useMemo(
    () => formatDuration(session.started_at, session.ended_at),
    [session.started_at, session.ended_at],
  )

  const sessionState = useMemo(
    () => getSessionState(session.started_at),
    [session.started_at],
  )

  // Get last catch time for smart end suggestion
  const lastCatch = catches.length > 0 
    ? catches.reduce((latest, c) => 
        new Date(c.caught_at) > new Date(latest.caught_at) ? c : latest
      )
    : null

  const title = session.title || session.location_name
  const waterBadge = getWaterTypeBadge(session)

  // Style classes based on session state
  const stateStyles = {
    normal: {
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-900/30',
      label: 'text-emerald-400',
      pill: 'bg-emerald-900/50 text-emerald-300',
      dot: 'bg-emerald-400',
    },
    warning: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-900/30',
      label: 'text-amber-400',
      pill: 'bg-amber-900/50 text-amber-300',
      dot: 'bg-amber-400',
    },
    critical: {
      border: 'border-red-500/40',
      bg: 'bg-red-900/30',
      label: 'text-red-400',
      pill: 'bg-red-900/50 text-red-300',
      dot: 'bg-red-400',
    },
  }

  const styles = stateStyles[sessionState]

  const handleEndSession = async () => {
    // Use last catch time if available, otherwise use now
    const endTime = lastCatch 
      ? new Date(lastCatch.caught_at).toISOString()
      : new Date().toISOString()
    
    try {
      await updateSession({ id: session.id, ended_at: endTime })
      await queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setShowEndConfirm(false)
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  // Format suggested end time for display
  const suggestedEndTimeLabel = lastCatch
    ? `End at ${new Date(lastCatch.caught_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (last catch)`
    : 'End now'

  return (
    <section className={`mb-3 overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} p-4 text-xs shadow-sm`}>
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${styles.label}`}>
              {sessionState === 'critical' ? '⚠️ Session running long' : sessionState === 'warning' ? 'Still fishing?' : 'Active session'}
            </p>
          </div>
          <p className="text-base font-semibold text-white">{title}</p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1 rounded-full ${styles.pill} px-2 py-0.5`}>
              <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${styles.dot}`} />
              Live · {durationLabel}
            </span>
            {waterBadge ? (
              <span className="rounded-full bg-background px-2 py-0.5 text-muted-foreground">{waterBadge}</span>
            ) : null}
            <span className="rounded-full bg-background px-2 py-0.5 text-muted-foreground">
              {catches.length} {catches.length === 1 ? 'catch' : 'catches'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {!showEndConfirm ? (
            <>
              <Link
                to={`/sessions/${session.id}`}
                className="rounded-full bg-navy-800 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-navy-900"
              >
                View
              </Link>
              <button
                type="button"
                onClick={() => setShowEndConfirm(true)}
                className="flex items-center gap-1 rounded-full bg-red-900/50 px-3 py-1.5 text-[11px] font-semibold text-red-300 shadow-sm hover:bg-red-900/70"
              >
                <Square size={10} />
                End
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={handleEndSession}
                disabled={isPending}
                className="flex items-center justify-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? <Loader2 size={10} className="animate-spin" /> : <Square size={10} />}
                {suggestedEndTimeLabel}
              </button>
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="rounded-full px-3 py-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
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
