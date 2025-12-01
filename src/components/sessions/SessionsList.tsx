import { isToday, isYesterday } from 'date-fns'
import { Link } from 'react-router-dom'
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
            <div
              key={session.id}
              className="flex items-start justify-between gap-2 rounded-xl bg-surface p-2 text-xs text-slate-700 shadow-sm"
            >
              <div className="flex-1">
                <SessionCard session={session} />
              </div>
              <div className="pl-1 pt-1">
                <Link
                  to={`/sessions/${session.id}?share=1`}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Share
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}

      {yesterday.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Yesterday</p>
          {yesterday.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between gap-2 rounded-xl bg-surface p-2 text-xs text-slate-700 shadow-sm"
            >
              <div className="flex-1">
                <SessionCard session={session} />
              </div>
              <div className="pl-1 pt-1">
                <Link
                  to={`/sessions/${session.id}?share=1`}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Share
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}

      {earlier.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Earlier</p>
          {earlier.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between gap-2 rounded-xl bg-surface p-2 text-xs text-slate-700 shadow-sm"
            >
              <div className="flex-1">
                <SessionCard session={session} />
              </div>
              <div className="pl-1 pt-1">
                <Link
                  to={`/sessions/${session.id}?share=1`}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Share
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
