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
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        <div className="mb-2 text-3xl">🎣</div>
        <p className="font-medium text-slate-700">No sessions yet</p>
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
      <div className="flex items-center justify-between text-xs text-slate-700">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Your sessions</p>
        <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-2 py-0.5 ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`rounded-full px-2 py-0.5 ${
              filter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`rounded-full px-2 py-0.5 ${
              filter === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {today.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Today</p>
          {today.map((session) => (
            <div
              key={session.id}
              className="group relative overflow-hidden rounded-2xl bg-white p-3 text-xs text-slate-700 shadow-sm transition-shadow hover:shadow-md"
            >
              <SessionCard session={session} />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-hover:text-slate-400" size={20} />
              <Link
                to={`/sessions/${session.id}?share=1`}
                className="absolute bottom-3 right-3 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Share
              </Link>
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
              className="group relative overflow-hidden rounded-2xl bg-white p-3 text-xs text-slate-700 shadow-sm transition-shadow hover:shadow-md"
            >
              <SessionCard session={session} />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-hover:text-slate-400" size={20} />
              <Link
                to={`/sessions/${session.id}?share=1`}
                className="absolute bottom-3 right-3 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Share
              </Link>
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
              className="group relative overflow-hidden rounded-2xl bg-white p-3 text-xs text-slate-700 shadow-sm transition-shadow hover:shadow-md"
            >
              <SessionCard session={session} />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-hover:text-slate-400" size={20} />
              <Link
                to={`/sessions/${session.id}?share=1`}
                className="absolute bottom-3 right-3 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
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
