import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useUpdateSession } from '../hooks/useUpdateSession'
import { useSessionParticipants, useMySessionRole, useLeaveSession, useChangeParticipantRole, useRemoveParticipant } from '../hooks/useSessionParticipants'
import { useMarkSessionViewed } from '../hooks/useMarkSessionViewed'
import { Map } from '../components/map'
import { CatchCard } from '../components/catches/CatchCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { QuickLogForm } from '../components/catches/QuickLogForm'
import { getLocationPrivacyLabel, type ViewerRole } from '../lib/privacy'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Plus, Share2, Users, MapPin, Fish, Clock, Scale, MoreHorizontal, Trash2, Pencil, LogOut, Bookmark } from 'lucide-react'
import { ShareToFeedModal } from '../components/session/ShareToFeedModal'
import { EditSessionModal } from '../components/session/EditSessionModal'
import { ParticipantsList } from '../components/session/ParticipantsList'
import { InviteToSessionModal } from '../components/session/InviteToSessionModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ErrorState } from '../components/ui/ErrorState'
import { useDeleteSession } from '../hooks/useDeleteSession'
import { useSavedMarks } from '../hooks/useSavedMarks'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'

export function SessionDetailPage() {
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
  const [shareMode, setShareMode] = useState<'feed' | 'profile' | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: session, isLoading, isError, error, refetch } = useSession(id)
  const { mutateAsync: updateSession, isPending: isEnding } = useUpdateSession()
  const markViewed = useMarkSessionViewed()
  const { createMark, marks: savedMarks } = useSavedMarks()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setCurrentUserId(data.user?.id ?? null)
    }
    void loadUser()
  }, [])

  useEffect(() => {
    if (session && session.ended_at && id) {
      markViewed.mutate(id)
    }
  }, [session?.ended_at, id])

  useEffect(() => {
    const wantShare = searchParams.get('share')
    if (!wantShare) return
    const normalized = wantShare.toLowerCase()
    if (normalized !== '1' && normalized !== 'true') return
    if (!session || !currentUserId) return
    if (session.user_id !== currentUserId) return
    setShareMode('feed')
  }, [searchParams, session, currentUserId])

  const { data: participants = [] } = useSessionParticipants(id)
  const { data: mySessionRole } = useMySessionRole(id)
  const { mutateAsync: leaveSession, isPending: isLeaving } = useLeaveSession()
  const { mutateAsync: changeParticipantRole } = useChangeParticipantRole()
  const { mutateAsync: removeParticipant } = useRemoveParticipant()
  const { mutateAsync: deleteSession, isPending: isDeleting } = useDeleteSession()

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-navy-800" />
          <p className="mt-3 text-sm text-gray-600">Loading session…</p>
        </div>
      </main>
    )
  }

  if (isError || !session) {
    const message = error instanceof Error ? error.message : 'Please try again in a moment.'
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} />
          Back to Logbook
        </Link>
        <ErrorState title="Failed to load session" message={message} />
      </main>
    )
  }

  const title = session.title || session.location_name || 'Fishing Session'
  const privacyLabel = getLocationPrivacyLabel(session)
  const isOwner = currentUserId != null && currentUserId === session.user_id
  const viewerRole: ViewerRole = isOwner ? 'owner' : 'guest'
  const canSeeExactLocation = viewerRole === 'owner' || session.location_privacy === 'exact'
  const canLogCatches = isOwner || mySessionRole === 'contributor'
  const isActive = !session.ended_at

  const myParticipant = participants.find(
    (p) => p.user_id === currentUserId && (p.status === 'active' || p.status === 'pending'),
  ) ?? null

  const handleEndSession = async () => {
    if (!session || session.ended_at) return
    await updateSession({ id: session.id, ended_at: new Date().toISOString() })
    await refetch()
  }

  const sessionDate = session.started_at ? format(new Date(session.started_at), 'EEEE, MMMM d, yyyy') : null
  const sessionTime = session.started_at ? format(new Date(session.started_at), 'h:mm a') : null

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} />
          </Link>

          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={() => setShareMode('feed')}
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              >
                <Share2 size={20} />
              </button>
            )}
            {(isOwner || myParticipant) && (
              <button
                type="button"
                onClick={() => setShowActions(!showActions)}
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              >
                <MoreHorizontal size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Actions dropdown - Owner */}
        {showActions && isOwner && (
          <div className="absolute right-4 top-14 z-20 w-48 rounded-xl bg-white py-2 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => { setShowEditModal(true); setShowActions(false) }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={16} />
              Edit Session
            </button>
            <button
              type="button"
              onClick={() => { setShareMode('feed'); setShowActions(false) }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Share2 size={16} />
              Share to Feed
            </button>
            <button
              type="button"
              onClick={() => { setShareMode('profile'); setShowActions(false) }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Users size={16} />
              Share to Profile
            </button>
            <button
              type="button"
              onClick={() => { setShowInviteModal(true); setShowActions(false) }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus size={16} />
              Invite Angler
            </button>
            {session && session.latitude && session.longitude && !savedMarks.some(m => 
              Math.abs(m.latitude - session.latitude) < 0.001 && 
              Math.abs(m.longitude - session.longitude) < 0.001
            ) && (
              <button
                type="button"
                onClick={() => {
                  if (!session) return
                  createMark.mutate({
                    name: session.location_name || session.title || 'Fishing spot',
                    latitude: session.latitude,
                    longitude: session.longitude,
                    water_type: (session.water_type as string) === 'saltwater' ? 'sea' : 'lake',
                    privacy_level: 'private',
                  })
                  setShowActions(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Bookmark size={16} />
                Save as Mark
              </button>
            )}
            {isActive && (
              <>
                <div className="my-2 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => { setShowEndConfirm(true); setShowActions(false) }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  End Session
                </button>
              </>
            )}
            <div className="my-2 border-t border-gray-100" />
            <button
              type="button"
              onClick={() => { setShowDeleteConfirm(true); setShowActions(false) }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} />
              Delete Session
            </button>
          </div>
        )}

        {/* Actions dropdown - Participant (not owner) */}
        {showActions && !isOwner && myParticipant && (
          <div className="absolute right-4 top-14 z-20 w-48 rounded-xl bg-white py-2 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => { setShowLeaveConfirm(true); setShowActions(false) }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} />
              Leave Session
            </button>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* Session Hero */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                {isActive ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                    Live
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Completed
                  </span>
                )}
              </div>
              {sessionDate && (
                <p className="mt-1 text-sm text-gray-500">
                  {sessionDate} · {sessionTime}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <MapPin size={14} />
                <span>{session.location_name || 'Unknown location'}</span>
              </div>
              {/* Privacy indicator */}
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400">
                {session.location_privacy === 'private' && (
                  <>🔒 Location hidden</>
                )}
                {session.location_privacy === 'general' && (
                  <>📍 Showing general area (~5km offset)</>
                )}
                {session.location_privacy === 'exact' && (
                  <>🎯 Showing exact location</>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isOwner 
                  ? 'bg-navy-800 text-white' 
                  : mySessionRole === 'contributor'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                {isOwner ? 'Owner' : mySessionRole === 'contributor' ? 'Contributor' : 'Viewer'}
              </span>
              {myParticipant && !isOwner && (
                <button
                  type="button"
                  disabled={isLeaving}
                  onClick={() => void leaveSession({ participant_id: myParticipant.id, session_id: session.id })}
                  className="mt-2 block text-xs text-red-600 hover:underline"
                >
                  {isLeaving ? 'Leaving…' : 'Leave session'}
                </button>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mt-5 grid grid-cols-4 gap-3">
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <Fish size={20} className="mx-auto text-gray-400" />
              <p className="mt-1 text-lg font-bold text-gray-900">{session.stats.total_catches}</p>
              <p className="text-[10px] text-gray-500">Catches</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <Scale size={20} className="mx-auto text-gray-400" />
              <p className="mt-1 text-lg font-bold text-gray-900">{session.stats.total_weight_kg.toFixed(1)}</p>
              <p className="text-[10px] text-gray-500">kg Total</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <div className="mx-auto h-5 w-5 text-center text-gray-400">🐟</div>
              <p className="mt-1 text-lg font-bold text-gray-900">{Object.keys(session.stats.species_breakdown).length}</p>
              <p className="text-[10px] text-gray-500">Species</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <Clock size={20} className="mx-auto text-gray-400" />
              <p className="mt-1 text-lg font-bold text-gray-900">{session.stats.duration_hours.toFixed(1)}</p>
              <p className="text-[10px] text-gray-500">Hours</p>
            </div>
          </div>
        </div>

        {/* Quick Log Button */}
        {canLogCatches && (
          <button
            type="button"
            onClick={() => setIsQuickLogOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 py-3 font-semibold text-white shadow-sm hover:bg-navy-900"
          >
            <Plus size={20} />
            Log a Catch
          </button>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Participants</h2>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="text-xs font-medium text-navy-800 hover:underline"
                >
                  + Invite
                </button>
              )}
            </div>
            <ParticipantsList
              participants={participants}
              currentUserId={currentUserId}
              myRole={isOwner ? 'owner' : mySessionRole ?? null}
              onChangeRole={isOwner ? (participant, role) => {
                void changeParticipantRole({ participant_id: participant.id, session_id: session.id, role })
              } : undefined}
              onRemove={isOwner ? (participant) => {
                void removeParticipant({ participant_id: participant.id, session_id: session.id })
              } : undefined}
            />
          </div>
        )}

        {/* Location Map */}
        {canSeeExactLocation && session.latitude && session.longitude && (
          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="h-48 w-full">
              <Map catches={session.catches} variant="mini" />
            </div>
          </div>
        )}

        {/* Catches */}
        <div className="mt-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Catches ({session.catches.length})
          </h2>
          {session.catches.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <Fish size={32} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No catches logged yet</p>
              {canLogCatches && (
                <button
                  type="button"
                  onClick={() => setIsQuickLogOpen(true)}
                  className="mt-3 text-sm font-medium text-navy-800 hover:underline"
                >
                  Log your first catch
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {session.catches.map((c) => (
                <CatchCard key={c.id} item={c} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick log bottom sheet */}
      {canLogCatches && (
        <BottomSheet open={isQuickLogOpen} title="Log a Catch" onClose={() => setIsQuickLogOpen(false)}>
          <QuickLogForm
            session={session}
            onLogged={async () => { await refetch() }}
            onClose={() => setIsQuickLogOpen(false)}
          />
        </BottomSheet>
      )}

      {/* Share modal */}
      {isOwner && shareMode && (
        <ShareToFeedModal
          session={session}
          mode={shareMode}
          onClose={() => setShareMode(null)}
          onSuccess={() => {
            window.alert(shareMode === 'profile' ? 'Session shared to your profile!' : 'Session shared to your feed!')
          }}
        />
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <InviteToSessionModal sessionId={session.id} onClose={() => setShowInviteModal(false)} />
      )}

      {/* End session confirm */}
      <ConfirmDialog
        isOpen={showEndConfirm}
        title="End session?"
        message="You can still view this session later. Ending it will stop further catch logging."
        confirmLabel={isEnding ? 'Ending…' : 'End session'}
        cancelLabel="Cancel"
        onCancel={() => setShowEndConfirm(false)}
        onConfirm={() => { setShowEndConfirm(false); void handleEndSession() }}
      />

      {/* Delete session confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete session?"
        message="This will permanently delete this session and all its catches. This cannot be undone."
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete session'}
        cancelLabel="Cancel"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          try {
            await deleteSession(session!.id)
            toast.success('Session deleted')
            navigate('/dashboard')
          } catch {
            toast.error('Failed to delete session')
          }
          setShowDeleteConfirm(false)
        }}
      />

      {/* Edit Session Modal */}
      {showEditModal && session && (
        <EditSessionModal
          session={session}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            void refetch()
          }}
        />
      )}

      {/* Leave session confirm */}
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title="Leave session?"
        message="You will no longer be able to log catches to this session."
        confirmLabel={isLeaving ? 'Leaving…' : 'Leave session'}
        cancelLabel="Cancel"
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={async () => {
          if (!myParticipant) return
          try {
            await leaveSession({ participant_id: myParticipant.id, session_id: session!.id })
            toast.success('Left session')
            navigate('/dashboard')
          } catch {
            toast.error('Failed to leave session')
          }
          setShowLeaveConfirm(false)
        }}
      />
    </main>
  )
}
