import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useActiveSessions } from '../../hooks/useActiveSession'
import { WARNING_THRESHOLD_HOURS } from '../../hooks/useZombieSessions'

function formatDurationShort(startedAt: string): string {
  const start = new Date(startedAt).getTime()
  const diffMinutes = Math.round((Date.now() - start) / (1000 * 60))
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/**
 * Sticky floating pill that shows when a session has been running 4+ hours.
 * Displayed at the bottom of the screen as a subtle reminder.
 */
export function SessionDurationPill() {
  const { data: sessions } = useActiveSessions()

  // Find the longest running session that exceeds the warning threshold
  const longRunningSession = useMemo(() => {
    if (!sessions || sessions.length === 0) return null
    
    const now = Date.now()
    const sessionsWithDuration = sessions.map(s => ({
      ...s,
      hours: (now - new Date(s.started_at).getTime()) / (1000 * 60 * 60)
    }))
    
    // Filter to sessions over warning threshold and get the longest
    const longSessions = sessionsWithDuration.filter(s => s.hours >= WARNING_THRESHOLD_HOURS)
    if (longSessions.length === 0) return null
    
    return longSessions.reduce((longest, s) => s.hours > longest.hours ? s : longest)
  }, [sessions])

  if (!longRunningSession) return null

  const duration = formatDurationShort(longRunningSession.started_at)
  const title = longRunningSession.title || longRunningSession.location_name || 'Session'

  return (
    <Link
      to={`/sessions/${longRunningSession.id}`}
      className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 transform animate-bounce"
    >
      <div className="flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-900/90 px-4 py-2 shadow-lg backdrop-blur-sm">
        <Clock size={14} className="text-amber-400" />
        <span className="text-xs font-medium text-amber-200">
          {title} · {duration}
        </span>
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-amber-950">
          Still running
        </span>
      </div>
    </Link>
  )
}
