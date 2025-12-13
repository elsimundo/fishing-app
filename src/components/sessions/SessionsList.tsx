import { useState } from 'react'
import { isToday, isYesterday } from 'date-fns'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useMySessions } from '../../hooks/useSessions'
import { SessionCard } from './SessionCard'

export function SessionsList() {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const { data, isLoading, isError, error } = useMySessions()

  if (isLoading) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Loading sessions…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-900/30 border border-red-500/40 px-3 py-2 text-xs text-red-400">
        Failed to load sessions: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  const sessions = data ?? []

  if (!sessions.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        <div className="mb-2 text-3xl">🎣</div>
        <p className="font-medium text-foreground">No sessions yet</p>
        <p className="mt-1 text-xs">Start your first fishing session to see it here</p>
      </div>
    )
  }

  const today: typeof sessions = []
  const yesterday: typeof sessions = []
  const earlier: typeof sessions = []

  for (const session of sessions) {
    const isCompleted = Boolean(session.ended_at)
    if (filter === 'active' && isCompleted) continue
    if (filter === 'completed' && !isCompleted) continue

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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your sessions</p>
        <div className="inline-flex rounded-full bg-background p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-2 py-0.5 ${
              filter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`rounded-full px-2 py-0.5 ${
              filter === 'active' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`rounded-full px-2 py-0.5 ${
              filter === 'completed' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {today.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
          {today.map((session) => (
            <div
              key={session.id}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border p-3 text-xs text-muted-foreground shadow-sm transition-shadow hover:shadow-md"
            >
              <SessionCard session={session} />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-foreground" size={20} />
              <Link
                to={`/sessions/${session.id}?share=1`}
                className="absolute bottom-3 right-3 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm hover:bg-muted"
              >
                Share
              </Link>
            </div>
          ))}
        </section>
      )}

      {yesterday.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Yesterday</p>
          {yesterday.map((session) => (
            <div
              key={session.id}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border p-3 text-xs text-muted-foreground shadow-sm transition-shadow hover:shadow-md"
            >
              <SessionCard session={session} />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-foreground" size={20} />
              <Link
                to={`/sessions/${session.id}?share=1`}
                className="absolute bottom-3 right-3 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm hover:bg-muted"
              >
                Share
              </Link>
            </div>
          ))}
        </section>
      )}

      {earlier.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Earlier</p>
          {earlier.map((session) => (
            <div
              key={session.id}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border p-3 text-xs text-muted-foreground shadow-sm transition-shadow hover:shadow-md"
            >
              <SessionCard session={session} />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-foreground" size={20} />
              <Link
                to={`/sessions/${session.id}?share=1`}
                className="absolute bottom-3 right-3 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm hover:bg-muted"
              >
                Share
              </Link>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
