import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useUpdateSession } from '../hooks/useUpdateSession'
import { useSessionShares, useAddSessionShare, useDeleteSessionShare } from '../hooks/useSessionShares'
import { Map } from '../components/map'
import { CatchCard } from '../components/catches/CatchCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { QuickLogForm } from '../components/catches/QuickLogForm'
import { getLocationPrivacyLabel } from '../lib/privacy'

export function SessionDetailPage() {
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, isError, error, refetch } = useSession(id)
  const { mutateAsync: updateSession, isPending: isEnding } = useUpdateSession()
  const { data: shares } = useSessionShares(id)
  const { mutateAsync: addShare, isPending: isAddingShare } = useAddSessionShare()
  const { mutateAsync: deleteShare, isPending: isDeletingShare } = useDeleteSessionShare()

  const [newShareUserId, setNewShareUserId] = useState('')
  const [shareError, setShareError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-slate-600">Loading session…</p>
        </div>
      </main>
    )
  }

  const handleAddShare = async () => {
    if (!session || !newShareUserId.trim()) return
    setShareError(null)

    try {
      await addShare({
        session_id: session.id,
        shared_with_user_id: newShareUserId.trim(),
        can_view_exact_location: true,
      })
      setNewShareUserId('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add share.'
      setShareError(message)
    }
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
  const privacyLabel = getLocationPrivacyLabel(session)

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
          <p className="mt-1 text-[11px] text-slate-500">Session overview · {privacyLabel}</p>
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

        <section className="rounded-xl bg-surface p-3 text-xs text-slate-700 shadow">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Share session</p>
          <p className="mt-1 text-[11px] text-slate-500">
            For now, sharing is by user ID. Viewers get read-only access to this session.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newShareUserId}
              onChange={(e) => setNewShareUserId(e.target.value)}
              placeholder="Friend's user ID (UUID)"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              disabled={isAddingShare || !newShareUserId.trim()}
              onClick={() => {
                void handleAddShare()
              }}
              className="rounded-md bg-primary px-3 py-2 text-[11px] font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {isAddingShare ? 'Adding…' : 'Add viewer'}
            </button>
          </div>
          {shareError ? <p className="mt-1 text-[11px] text-red-600">{shareError}</p> : null}

          <div className="mt-3 space-y-1">
            <p className="text-[11px] font-medium text-slate-700">Current viewers</p>
            {!shares || shares.length === 0 ? (
              <p className="text-[11px] text-slate-500">No additional viewers yet.</p>
            ) : (
              <ul className="space-y-1">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-600"
                  >
                    <div className="flex-1 truncate">
                      <p className="truncate" title={share.shared_with_user_id}>
                        {share.shared_with_user_id}
                      </p>
                      <p className="text-[10px] text-slate-500">Read-only · {share.can_view_exact_location ? 'Exact' : 'General'}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isDeletingShare}
                      onClick={() => {
                        void deleteShare({ id: share.id, session_id: share.session_id })
                      }}
                      className="ml-2 rounded-md border border-slate-300 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl bg-surface p-3 text-xs text-slate-700 shadow">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Session stats</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4 sm:text-xs">
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] text-slate-500">Catches</p>
              <p className="text-sm font-semibold text-slate-900">{session.stats.total_catches}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] text-slate-500">Total weight</p>
              <p className="text-sm font-semibold text-slate-900">{session.stats.total_weight_kg.toFixed(1)} kg</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] text-slate-500">Species</p>
              <p className="text-sm font-semibold text-slate-900">{Object.keys(session.stats.species_breakdown).length}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] text-slate-500">Duration</p>
              <p className="text-sm font-semibold text-slate-900">{session.stats.duration_hours.toFixed(1)} h</p>
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
