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
      <div className="space-y-2 text-sm text-gray-400">
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
      <div className="rounded-2xl border-2 border-dashed border-[#334155] bg-[#243B4A] p-6 text-center text-sm text-gray-400">
        <div className="mb-2 text-3xl">🎣</div>
        <p className="font-medium text-white">No sessions yet</p>
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
      <div className="flex items-center justify-between text-xs text-gray-400">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Your sessions</p>
        <div className="inline-flex rounded-full bg-[#1A2D3D] p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-2 py-0.5 ${
              filter === 'all' ? 'bg-[#1BA9A0] text-white shadow-sm' : 'text-gray-400'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`rounded-full px-2 py-0.5 ${
              filter === 'active' ? 'bg-[#1BA9A0] text-white shadow-sm' : 'text-gray-400'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`rounded-full px-2 py-0.5 ${
              filter === 'completed' ? 'bg-[#1BA9A0] text-white shadow-sm' : 'text-gray-400'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {today.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Today</p>
          {today.map((session) => (
            <div
              key={session.id}
              className="group relative overflow-hidden rounded-2xl bg-[#243B4A] border border-[#334155] p-3 text-xs text-gray-400 shadow-sm transition-shadow hover:shadow-md"
            >
              <SessionCard session={session} />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-hover:text-gray-400" size={20} />
              <Link
                to={`/sessions/${session.id}?share=1`}
                className="absolute bottom-3 right-3 rounded-full border border-[#334155] bg-[#1A2D3D] px-2 py-1 text-[10px] font-medium text-gray-400 shadow-sm hover:bg-[#334155]"
              >
                Share
              </Link>
            </div>
          ))}
        </section>
      )}

      {yesterday.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Yesterday</p>
          {yesterday.map((session) => (
            <div
              key={session.id}
              className="group relative overflow-hidden rounded-2xl bg-[#243B4A] border border-[#334155] p-3 text-xs text-gray-400 shadow-sm transition-shadow hover:shadow-md"
            >
              <SessionCard session={session} />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-hover:text-gray-400" size={20} />
              <Link
                to={`/sessions/${session.id}?share=1`}
                className="absolute bottom-3 right-3 rounded-full border border-[#334155] bg-[#1A2D3D] px-2 py-1 text-[10px] font-medium text-gray-400 shadow-sm hover:bg-[#334155]"
              >
                Share
              </Link>
            </div>
          ))}
        </section>
      )}

      {earlier.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Earlier</p>
          {earlier.map((session) => (
            <div
              key={session.id}
              className="group relative overflow-hidden rounded-2xl bg-[#243B4A] border border-[#334155] p-3 text-xs text-gray-400 shadow-sm transition-shadow hover:shadow-md"
            >
              <SessionCard session={session} />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-hover:text-gray-400" size={20} />
              <Link
                to={`/sessions/${session.id}?share=1`}
                className="absolute bottom-3 right-3 rounded-full border border-[#334155] bg-[#1A2D3D] px-2 py-1 text-[10px] font-medium text-gray-400 shadow-sm hover:bg-[#334155]"
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
