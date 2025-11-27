import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useUpdateSession } from '../hooks/useUpdateSession'
import { Map } from '../components/map'
import { CatchCard } from '../components/catches/CatchCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { QuickLogForm } from '../components/catches/QuickLogForm'

export function SessionDetailPage() {
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, isError, error, refetch } = useSession(id)
  const { mutateAsync: updateSession, isPending: isEnding } = useUpdateSession()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-slate-600">Loading session…</p>
        </div>
      </main>
    )
  }

  if (isError || !session) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <Link to="/dashboard" className="mb-4 inline-block text-xs text-secondary hover:underline">
          ← Back to dashboard
        </Link>
        <div className="max-w-xs rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <p className="font-medium">Failed to load session.</p>
          <p className="mt-1 text-[11px] text-red-600">
            {error instanceof Error ? error.message : 'Please try again in a moment.'}
          </p>
        </div>
      </main>
    )
  }

  const title = session.title || session.location_name

  const handleEndSession = async () => {
    if (!session || session.ended_at) return

    const confirmed = window.confirm('End this session? You can still view it later in your sessions list.')
    if (!confirmed) return

    await updateSession({ id: session.id, ended_at: new Date().toISOString() })
    await refetch()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <Link to="/dashboard" className="text-secondary hover:underline">
            ← Back to dashboard
          </Link>
        </div>

        <section className="overflow-hidden rounded-xl bg-surface p-4 text-xs text-slate-700 shadow">
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-[11px] text-slate-500">Session overview</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">Catch location and details below.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuickLogOpen(true)}
                className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-primary/90"
              >
                Quick log catch
              </button>
              <button
                type="button"
                disabled={isEnding || Boolean(session.ended_at)}
                onClick={() => {
                  void handleEndSession()
                }}
                className="rounded-md border border-slate-300 bg-surface px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {session.ended_at ? 'Session ended' : isEnding ? 'Ending…' : 'End session'}
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-surface p-3 shadow">
          <h2 className="mb-2 text-xs font-semibold text-slate-800">Location</h2>
          <div className="h-48 w-full overflow-hidden rounded-lg">
            <Map catches={session.catches} variant="mini" />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-surface p-3 shadow">
          <h2 className="mb-2 text-xs font-semibold text-slate-800">
            Catches ({session.catches.length})
          </h2>
          {session.catches.length === 0 ? (
            <p className="text-[11px] text-slate-500">No catches logged yet for this session.</p>
          ) : (
            <div className="space-y-2">
              {session.catches.map((c) => (
                <CatchCard key={c.id} item={c} />
              ))}
            </div>
          )}
        </section>

        <BottomSheet
          open={isQuickLogOpen}
          title="Quick log catch"
          onClose={() => setIsQuickLogOpen(false)}
        >
          <QuickLogForm
            session={session}
            onLogged={async () => {
              await refetch()
            }}
            onClose={() => setIsQuickLogOpen(false)}
          />
        </BottomSheet>
      </div>
    </main>
  )
}
