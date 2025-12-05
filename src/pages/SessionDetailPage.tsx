import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useUpdateSession } from '../hooks/useUpdateSession'
import { useSessionShares, useAddSessionShare, useDeleteSessionShare } from '../hooks/useSessionShares'
import { useSessionParticipants, useMySessionRole, useLeaveSession, useChangeParticipantRole, useRemoveParticipant } from '../hooks/useSessionParticipants'
import { useMarkSessionViewed } from '../hooks/useMarkSessionViewed'
import { Map } from '../components/map'
import { CatchCard } from '../components/catches/CatchCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { QuickLogForm } from '../components/catches/QuickLogForm'
import { getLocationPrivacyLabel, type ViewerRole } from '../lib/privacy'
import { supabase } from '../lib/supabase'
import { Share2, User2 } from 'lucide-react'
import { ShareToFeedModal } from '../components/session/ShareToFeedModal'
import { ParticipantsList } from '../components/session/ParticipantsList'
import { InviteToSessionModal } from '../components/session/InviteToSessionModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ErrorState } from '../components/ui/ErrorState'

export function SessionDetailPage() {
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
  const [shareMode, setShareMode] = useState<'feed' | 'profile' | null>(null)

  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { data: session, isLoading, isError, error, refetch } = useSession(id)
  const { mutateAsync: updateSession, isPending: isEnding } = useUpdateSession()
  const { data: shares } = useSessionShares(id)
  const { mutateAsync: addShare, isPending: isAddingShare } = useAddSessionShare()
  const { mutateAsync: deleteShare, isPending: isDeletingShare } = useDeleteSessionShare()
  const markViewed = useMarkSessionViewed()

  const [newShareEmail, setNewShareEmail] = useState('')
  const [isFindingUser, setIsFindingUser] = useState(false)
  const [newShareUserId, setNewShareUserId] = useState('')
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareSuccess, setShareSuccess] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [viewerEmails, setViewerEmails] = useState<Record<string, string | null>>({})
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [shareToRemoveId, setShareToRemoveId] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setCurrentUserId(data.user?.id ?? null)
    }

    void loadUser()
  }, [])

  // Mark session as viewed if it's ended
  useEffect(() => {
    if (session && session.ended_at && id) {
      markViewed.mutate(id)
    }
  }, [session?.ended_at, id])

  // Auto-open share modal when arriving with ?share=1 or ?share=true and viewer is owner
  useEffect(() => {
    const wantShare = searchParams.get('share')
    if (!wantShare) return
    const normalized = wantShare.toLowerCase()
    if (normalized !== '1' && normalized !== 'true') return

    if (!session || !currentUserId) return
    if (session.user_id !== currentUserId) return

    setShareMode('feed')
  }, [searchParams, session, currentUserId])

  useEffect(() => {
    async function loadViewerEmails() {
      if (!shares || shares.length === 0) {
        setViewerEmails({})
        return
      }

      const ids = Array.from(new Set(shares.map((s) => s.shared_with_user_id)))
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', ids)

      if (error || !data) return

      const map: Record<string, string | null> = {}
      for (const row of data as { id: string; email: string | null }[]) {
        map[row.id] = row.email
      }
      setViewerEmails(map)
    }

    void loadViewerEmails()
  }, [shares])

  const handleFindUserByEmail = async () => {
    if (!newShareEmail.trim()) return
    setShareError(null)
    setShareSuccess(null)
    setIsFindingUser(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newShareEmail.trim())
        .maybeSingle()

      if (error) throw new Error(error.message)

      if (!data) {
        setShareError('No user found with that email.')
        setNewShareUserId('')
        return
      }

      setNewShareUserId(data.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find user.'
      setShareError(message)
    } finally {
      setIsFindingUser(false)
    }
  }

  const handleAddShare = async () => {
    if (!session || !newShareUserId.trim()) return
    setShareError(null)
    setShareSuccess(null)

    try {
      await addShare({
        session_id: session.id,
        shared_with_user_id: newShareUserId.trim(),
        can_view_exact_location: true,
        owner_id: session.user_id,
      })
      setNewShareUserId('')
      setNewShareEmail('')
      setShareSuccess('Viewer added.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add share.'
      setShareError(message)
    }
  }

  const { data: participants = [] } = useSessionParticipants(id)
  const { data: mySessionRole } = useMySessionRole(id)
  const { mutateAsync: leaveSession, isPending: isLeaving } = useLeaveSession()
  const { mutateAsync: changeParticipantRole } = useChangeParticipantRole()
  const { mutateAsync: removeParticipant } = useRemoveParticipant()

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
    const message = error instanceof Error ? error.message : 'Please try again in a moment.'

    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <Link to="/sessions" className="mb-4 inline-block text-xs text-secondary hover:underline">
          Back to logbook
        </Link>
        <ErrorState title="Failed to load session" message={message} />
      </main>
    )
  }

  const title = session.title || session.location_name
  const privacyLabel = getLocationPrivacyLabel(session)
  const isOwner = currentUserId != null && currentUserId === session.user_id
  const viewerRole: ViewerRole = isOwner ? 'owner' : 'guest'
  const canSeeExactLocation = viewerRole === 'owner' || session.location_privacy === 'exact'
  const canLogCatches = isOwner || mySessionRole === 'contributor'

  const myParticipant =
    participants.find(
      (p) => p.user_id === currentUserId && (p.status === 'active' || p.status === 'pending'),
    ) ?? null

  const handleEndSession = async () => {
    if (!session || session.ended_at) return
    await updateSession({ id: session.id, ended_at: new Date().toISOString() })
    await refetch()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <Link to="/sessions" className="text-secondary hover:underline">
            Back to logbook
          </Link>
        </div>

        {/* Overview + main actions */}
        <section className="overflow-hidden rounded-xl bg-surface p-4 text-xs text-slate-700 shadow">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold text-slate-900">{title}</h1>
              <p className="mt-1 text-[11px] text-slate-500">Session overview · {privacyLabel}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                {isOwner
                  ? 'Owner'
                  : mySessionRole === 'contributor'
                    ? 'Contributor'
                    : mySessionRole === 'viewer'
                      ? 'Viewer'
                      : 'Viewer'}
              </span>
              {myParticipant && !isOwner ? (
                <button
                  type="button"
                  disabled={isLeaving}
                  onClick={() => {
                    void leaveSession({ participant_id: myParticipant.id, session_id: session.id })
                  }}
                  className="text-[10px] text-red-600 hover:underline disabled:opacity-60"
                >
                  {isLeaving ? 'Leaving…' : 'Leave session'}
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">Catch location and details below.</p>
            {isOwner ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShareMode('feed')}
                  className="flex items-center gap-1 rounded-md border border-slate-300 bg-surface px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Share2 size={14} />
                  Share to feed
                </button>
                <button
                  type="button"
                  onClick={() => setShareMode('profile')}
                  className="flex items-center gap-1 rounded-md border border-slate-300 bg-surface px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <User2 size={14} />
                  Share to profile
                </button>
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
                  onClick={() => setShowEndConfirm(true)}
                  className="rounded-md border border-slate-300 bg-surface px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {session.ended_at ? 'Session ended' : isEnding ? 'Ending…' : 'End session'}
                </button>
              </div>
            ) : canLogCatches ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickLogOpen(true)}
                  className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-primary/90"
                >
                  Quick log catch
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                You&apos;re viewing this session. Catch logging and editing are disabled for your role.
              </p>
            )}
          </div>
        </section>

        {/* Participants */}
        <section className="rounded-xl bg-surface p-3 text-xs text-slate-700 shadow">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Participants
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Anglers who can view or log catches in this session.
              </p>
            </div>
            {isOwner ? (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-primary/90"
              >
                Invite angler
              </button>
            ) : null}
          </div>

          <ParticipantsList
            participants={participants}
            currentUserId={currentUserId}
            myRole={isOwner ? 'owner' : mySessionRole ?? null}
            onChangeRole={
              isOwner
                ? (participant, role) => {
                    void changeParticipantRole({
                      participant_id: participant.id,
                      session_id: session.id,
                      role,
                    })
                  }
                : undefined
            }
            onRemove={
              isOwner
                ? (participant) => {
                    void removeParticipant({
                      participant_id: participant.id,
                      session_id: session.id,
                    })
                  }
                : undefined
            }
          />

          {isOwner ? (
            <p className="mt-2 text-[10px] text-slate-500">
              Contributors can log catches in this session. Viewers can see the trip but can&apos;t log or
              edit catches.
            </p>
          ) : null}
        </section>

        {/* Share session (viewer-level sharing) */}
        {viewerRole === 'owner' ? (
          <section className="rounded-xl bg-surface p-3 text-xs text-slate-700 shadow">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Share session</p>
            <p className="mt-1 text-[11px] text-slate-500">
              You can share this session with another signed-in user. Start by finding them by email, or paste their
              user ID directly.
            </p>

            <div className="mt-2 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={newShareEmail}
                  onChange={(e) => setNewShareEmail(e.target.value)}
                  placeholder="Friend&apos;s email"
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  disabled={isFindingUser || !newShareEmail.trim()}
                  onClick={() => {
                    void handleFindUserByEmail()
                  }}
                  className="rounded-md border border-slate-300 bg-surface px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {isFindingUser ? 'Finding…' : 'Find user'}
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newShareUserId}
                  onChange={(e) => setNewShareUserId(e.target.value)}
                  placeholder="Friend&apos;s user ID (UUID)"
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
            </div>

            {shareError ? <p className="mt-1 text-[11px] text-red-600">{shareError}</p> : null}
            {!shareError && shareSuccess ? (
              <p className="mt-1 text-[11px] text-emerald-600">{shareSuccess}</p>
            ) : null}

        {showInviteModal ? (
          <InviteToSessionModal sessionId={session.id} onClose={() => setShowInviteModal(false)} />
        ) : null}

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
                          {viewerEmails[share.shared_with_user_id] ?? share.shared_with_user_id}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Read-only · {share.can_view_exact_location ? 'Exact' : 'General'}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isDeletingShare}
                        onClick={() => setShareToRemoveId(share.id)}
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
        ) : null}

        {/* Session stats */}
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
              <p className="text-sm font-semibold text-slate-900">
                {Object.keys(session.stats.species_breakdown).length}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] text-slate-500">Duration</p>
              <p className="text-sm font-semibold text-slate-900">{session.stats.duration_hours.toFixed(1)} h</p>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="overflow-hidden rounded-xl bg-surface p-3 shadow">
          <h2 className="mb-2 text-xs font-semibold text-slate-800">Location</h2>
          {canSeeExactLocation ? (
            <div className="h-48 w-full overflow-hidden rounded-lg">
              <Map catches={session.catches} variant="mini" />
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">Location is hidden for privacy on shared views.</p>
          )}
        </section>

        {/* Catches */}
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

        {/* Quick log bottom sheet */}
        {canLogCatches ? (
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
        ) : null}

        {/* Share to feed/profile modal */}
        {isOwner && shareMode ? (
          <ShareToFeedModal
            session={session}
            mode={shareMode}
            onClose={() => setShareMode(null)}
            onSuccess={() => {
              if (shareMode === 'profile') {
                window.alert('Session shared to your profile!')
              } else {
                window.alert('Session shared to your feed!')
              }
            }}
          />
        ) : null}

        <ConfirmDialog
          isOpen={showEndConfirm}
          title="End session?"
          message="You can still view this session later in your logbook. Ending it will stop further logging for this trip."
          confirmLabel={isEnding ? 'Ending…' : 'End session'}
          cancelLabel="Cancel"
          onCancel={() => setShowEndConfirm(false)}
          onConfirm={() => {
            setShowEndConfirm(false)
            void handleEndSession()
          }}
        />

        <ConfirmDialog
          isOpen={shareToRemoveId != null}
          title="Remove viewer?"
          message="This person will no longer be able to view this shared session. You can always share it again later."
          confirmLabel={isDeletingShare ? 'Removing…' : 'Remove viewer'}
          cancelLabel="Cancel"
          onCancel={() => setShareToRemoveId(null)}
          onConfirm={() => {
            if (!shareToRemoveId) return
            const target = shares?.find((s) => s.id === shareToRemoveId)
            if (!target) {
              setShareToRemoveId(null)
              return
            }
            void deleteShare({ id: target.id, session_id: target.session_id }).finally(() => {
              setShareToRemoveId(null)
            })
          }}
        />
      </div>
    </main>
  )
}