import { isToday, isYesterday } from 'date-fns'
import { useSessions } from '../../hooks/useSessions'
import { SessionCard } from './SessionCard'

export function SessionsList() {
  const { data, isLoading, isError, error } = useSessions()

  if (isLoading) {
    return (
      <div className="space-y-2 text-sm text-slate-500">
        <p>Loading sessions…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
        Failed to load sessions: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  const sessions = data ?? []

  if (!sessions.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-surface p-4 text-sm text-slate-500">
        No sessions yet — start your first fishing session from the dashboard.
      </div>
    )
  }

  const today: typeof sessions = []
  const yesterday: typeof sessions = []
  const earlier: typeof sessions = []

  for (const session of sessions) {
    const startedAt = new Date(session.started_at)
    if (isToday(startedAt)) {
      today.push(session)
    } else if (isYesterday(startedAt)) {
      yesterday.push(session)
    } else {
      earlier.push(session)
    }
  }

  return (
    <div className="space-y-4">
      {today.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Today</p>
          {today.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </section>
      )}

      {yesterday.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Yesterday</p>
          {yesterday.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </section>
      )}

      {earlier.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Earlier</p>
          {earlier.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </section>
      )}
    </div>
  )
}
