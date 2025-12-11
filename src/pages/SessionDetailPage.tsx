import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useUpdateSession } from '../hooks/useUpdateSession'
import { useSessionParticipants, useMySessionRole, useLeaveSession, useChangeParticipantRole, useRemoveParticipant, useAcceptInvitation } from '../hooks/useSessionParticipants'
import { useMarkSessionViewed } from '../hooks/useMarkSessionViewed'
import { useSessionPosts, useDeletePost } from '../hooks/usePosts'
import { Map } from '../components/map'
import { CatchCard } from '../components/catches/CatchCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { QuickLogForm } from '../components/catches/QuickLogForm'
import { getLocationPrivacyLabel, type ViewerRole } from '../lib/privacy'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Plus, Share2, Users, MapPin, Fish, Clock, Scale, MoreHorizontal, Trash2, Pencil, LogOut, Bookmark, MessageSquare, X as XIcon } from 'lucide-react'
import { ShareToFeedModal } from '../components/session/ShareToFeedModal'
import { EditSessionModal } from '../components/session/EditSessionModal'
import { ParticipantsList } from '../components/session/ParticipantsList'
import { InviteToSessionModal } from '../components/session/InviteToSessionModal'
import { AddSessionPostModal } from '../components/session/AddSessionPostModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ErrorState } from '../components/ui/ErrorState'
import { useDeleteSession } from '../hooks/useDeleteSession'
import { useSavedMarks } from '../hooks/useSavedMarks'
import { useSessionXP } from '../hooks/useCatchXP'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'

export function SessionDetailPage() {
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showAddPostModal, setShowAddPostModal] = useState(false)

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: session, isLoading, isError, error, refetch } = useSession(id)
  const { mutateAsync: updateSession, isPending: isEnding } = useUpdateSession()
  const markViewed = useMarkSessionViewed()
  const { createMark, marks: savedMarks } = useSavedMarks()
  const { data: sessionPosts = [] } = useSessionPosts(id)
  const { mutateAsync: deletePost } = useDeletePost()

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
    setShowShareModal(true)
  }, [searchParams, session, currentUserId])

  const { data: participants = [] } = useSessionParticipants(id)
  const { data: mySessionRole } = useMySessionRole(id)
  const { mutateAsync: leaveSession, isPending: isLeaving } = useLeaveSession()
  const { mutateAsync: acceptInvitation, isPending: isAccepting } = useAcceptInvitation()
  const { mutateAsync: changeParticipantRole } = useChangeParticipantRole()
  const { mutateAsync: removeParticipant } = useRemoveParticipant()
  const { mutateAsync: deleteSession, isPending: isDeleting } = useDeleteSession()
  const sessionXP = useSessionXP()

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
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <ErrorState title="Failed to load session" message={message} />
      </main>
    )
  }

  // If this session is a competition, redirect to the competition page
  // The competition page IS the session page for competitions
  if (session.competition_id) {
    navigate(`/compete/${session.competition_id}`, { replace: true })
    return null
  }

  const title = session.title || session.location_name || 'Fishing Session'
  const privacyLabel = getLocationPrivacyLabel(session)
  const isOwner = currentUserId != null && currentUserId === session.user_id
  const viewerRole: ViewerRole = isOwner ? 'owner' : 'guest'
  const canSeeExactLocation = viewerRole === 'owner' || session.location_privacy === 'exact'
  const canLogCatches = isOwner || mySessionRole === 'contributor'
  const isActive = !session.ended_at

  const myParticipant =
    participants.find(
      (p) => p.user_id === currentUserId && (p.status === 'active' || p.status === 'pending'),
    ) ?? null
  
  const handleEndSession = async () => {
    if (!session || session.ended_at) return
    await updateSession({ id: session.id, ended_at: new Date().toISOString() })
    
    // Award XP for completing the session
    const catchCount = session.catches?.length || 0
    sessionXP.mutate({ sessionId: session.id, catchCount })
    
    await refetch()
  }

  const sessionDate = session.started_at ? format(new Date(session.started_at), 'EEEE, MMMM d, yyyy') : null
  const sessionTime = session.started_at ? format(new Date(session.started_at), 'h:mm a') : null
  const sortedCatches = [...session.catches].sort(
    (a, b) => new Date(b.caught_at).getTime() - new Date(a.caught_at).getTime(),
  )

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Pending invite banner for invited users */}
      {!isOwner && myParticipant && myParticipant.status === 'pending' && (
        <div className="border-b border-amber-200 bg-amber-50/80">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 text-xs">
            <div className="text-amber-900">
              <p className="font-semibold">Youve been invited to join this session</p>
              <p className="text-[11px] text-amber-800/90">Accept to start logging catches and posting in this session.</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={isAccepting || isLeaving}
                onClick={async () => {
                  try {
                    await acceptInvitation({ participant_id: myParticipant.id, session_id: session.id })
                    toast.success('You\'re now active in this session')
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to accept invite'
                    toast.error(message)
                  }
                }}
                className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:bg-primary/60"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={isAccepting || isLeaving}
                onClick={async () => {
                  try {
                    await leaveSession({ participant_id: myParticipant.id, session_id: session.id })
                    toast.success('You left this session')
                    navigate('/logbook')
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to leave session'
                    toast.error(message)
                  }
                }}
                className="rounded-full border border-amber-300 px-3 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
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
              onClick={() => { setShowShareModal(true); setShowActions(false) }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Share2 size={16} />
              Share to Feed
            </button>
            <button
              type="button"
              onClick={async () => {
                const url = `${window.location.origin}/sessions/${id}`
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: session?.title || 'Fishing Session',
                      text: `Check out this fishing session: ${session?.title || 'Fishing Session'}`,
                      url,
                    })
                  } catch (e) {
                    // User cancelled or share failed
                  }
                } else {
                  await navigator.clipboard.writeText(url)
                  toast.success('Link copied!')
                }
                setShowActions(false)
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Share2 size={16} />
              Share Link
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
        {/* Hero image / cover */}
        <div className="relative mb-4 overflow-hidden rounded-2xl bg-slate-900">
          {session.cover_photo_url ? (
            <img
              src={session.cover_photo_url}
              alt={title}
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className="h-64 w-full bg-gradient-to-br from-cyan-600 to-emerald-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />

          {/* Owner quick action: change cover photo */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur hover:bg-black/60"
            >
              <Pencil size={14} />
              <span className="hidden sm:inline">Change cover</span>
            </button>
          )}

          {/* Hero badge */}
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-navy-900 shadow-sm">
            <span>{typeof session.water_type === 'string' && session.water_type.includes('Sea') ? '🌊' : '🏞️'}</span>
            <span>
              {typeof session.water_type === 'string' ? session.water_type : 'Session'}
            </span>
            {isActive && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                Live
              </span>
            )}
            {!isActive && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                Completed
              </span>
            )}
          </div>

          {/* Hero stats */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-2">
            <div className="flex-1 rounded-xl bg-white/95 px-3 py-2 text-center text-xs backdrop-blur">
              <p className="text-base font-bold text-slate-900">{session.stats.total_catches}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Catches</p>
            </div>
            <div className="flex-1 rounded-xl bg-white/95 px-3 py-2 text-center text-xs backdrop-blur">
              <p className="text-base font-bold text-slate-900">{session.stats.duration_hours.toFixed(1)}h</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Duration</p>
            </div>
            <div className="flex-1 rounded-xl bg-white/95 px-3 py-2 text-center text-xs backdrop-blur">
              <p className="text-base font-bold text-slate-900">
                {session.stats.biggest_catch?.weight_kg != null
                  ? `${session.stats.biggest_catch.weight_kg.toFixed(1)}kg`
                  : session.stats.total_weight_kg > 0
                    ? `${session.stats.total_weight_kg.toFixed(1)}kg`
                    : '—'}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Biggest</p>
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">{title}</h1>
              {sessionDate && (
                <p className="mt-1 text-xs text-gray-500">
                  {sessionDate} · {sessionTime}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} />
                  <span>{session.location_name || 'Unknown location'}</span>
                </span>
                {session.location_privacy !== 'exact' && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {session.location_privacy === 'private'
                      ? '🔒 Location hidden'
                      : '📍 General area only'}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                  isOwner
                    ? 'bg-navy-800 text-white'
                    : mySessionRole === 'contributor'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {isOwner ? 'Owner' : mySessionRole === 'contributor' ? 'Contributor' : 'Viewer'}
              </span>
              {myParticipant && !isOwner && (
                <button
                  type="button"
                  disabled={isLeaving}
                  onClick={() => void leaveSession({ participant_id: myParticipant.id, session_id: session.id })}
                  className="mt-2 block text-[11px] text-red-600 hover:underline"
                >
                  {isLeaving ? 'Leaving…' : 'Leave session'}
                </button>
              )}
            </div>
          </div>

          {session.session_notes && (
            <p className="mt-3 text-sm text-slate-700">
              {session.session_notes}
            </p>
          )}
        </div>

        {/* Environmental conditions card */}
        {(session.weather_temp != null || session.wind_speed != null || session.tide_state || session.moon_phase) && (
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-navy-900 to-blue-700 p-4 text-xs text-white">
            <p className="mb-3 text-[13px] font-semibold opacity-90">📊 Conditions during session</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] opacity-80">Temperature</p>
                <p className="mt-1 text-base font-semibold">
                  {session.weather_temp != null ? `${session.weather_temp.toFixed(1)}°C` : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] opacity-80">Wind</p>
                <p className="mt-1 text-base font-semibold">
                  {session.wind_speed != null ? `${session.wind_speed.toFixed(1)} mph` : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] opacity-80">Tide</p>
                <p className="mt-1 text-base font-semibold">{session.tide_state || '—'}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] opacity-80">Weather</p>
                <p className="mt-1 text-base font-semibold">
                  {session.weather_condition || '—'}
                </p>
              </div>
              {session.moon_phase && (
                <div className="col-span-2 rounded-xl bg-white/10 p-3">
                  <p className="text-[11px] opacity-80">Moon Phase</p>
                  <p className="mt-1 text-base font-semibold">{session.moon_phase}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active session banner + quick stats + timeline */}
        {isActive && (
          <>
            {/* Active banner */}
            <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-center text-white">
              <p className="text-xs font-semibold tracking-wide text-emerald-100">
                SESSION IN PROGRESS
              </p>
              <p className="text-2xl font-bold">
                {session.stats.duration_hours.toFixed(1)}h
              </p>
              {sessionTime && (
                <p className="text-xs text-emerald-100">Started at {sessionTime}</p>
              )}
            </div>

            {/* Quick stats */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-xs">
                <div className="mb-1 text-lg">🐟</div>
                <p className="text-base font-bold text-gray-900">{session.stats.total_catches}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Catches</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-xs">
                <div className="mb-1 text-lg">⚖️</div>
                <p className="text-base font-bold text-gray-900">
                  {session.stats.biggest_catch?.weight_kg != null
                    ? `${session.stats.biggest_catch.weight_kg.toFixed(1)}kg`
                    : '—'}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Biggest</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-xs">
                <div className="mb-1 text-lg">📸</div>
                <p className="text-base font-bold text-gray-900">
                  {sortedCatches.filter((c) => c.photo_url).length}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Photos</p>
              </div>
            </div>

            {/* Log catch CTA (active) */}
            {canLogCatches && (
              <button
                type="button"
                onClick={() => setIsQuickLogOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900"
              >
                <Plus size={18} />
                Log new catch
              </button>
            )}

            {/* Timeline */}
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Session timeline</h2>
                {canLogCatches && (session.allow_posts || session.allow_comments) && (
                  <button
                    type="button"
                    onClick={() => setShowAddPostModal(true)}
                    className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <MessageSquare size={14} />
                    Add post
                  </button>
                )}
              </div>
              {sortedCatches.length === 0 && sessionPosts.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  No activity yet. Log a catch or add a post to start the timeline.
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {/* Merge catches and posts, sort by time */}
                    {[
                      ...sortedCatches.map((c) => ({ type: 'catch' as const, data: c, time: new Date(c.caught_at) })),
                      ...sessionPosts.map((p) => ({ type: 'post' as const, data: p, time: new Date(p.created_at) })),
                    ]
                      .sort((a, b) => b.time.getTime() - a.time.getTime())
                      .map((item) => {
                        if (item.type === 'catch') {
                          const c = item.data
                          return (
                            <button
                              key={`catch-${c.id}`}
                              type="button"
                              onClick={() => navigate(`/catches/${c.id}`)}
                              className="relative flex w-full items-start gap-3 pl-7 text-left transition-opacity hover:opacity-70"
                            >
                              <div className="absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-navy-800 shadow" />
                              {c.photo_url ? (
                                <img
                                  src={c.photo_url}
                                  alt={c.species}
                                  className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg">
                                  🐟
                                </div>
                              )}
                              <div className="flex-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {c.species}
                                    {c.weight_kg != null && ` • ${c.weight_kg.toFixed(1)}kg`}
                                  </p>
                                  <span className="ml-2 text-[11px] text-gray-500">
                                    {format(new Date(c.caught_at), 'HH:mm')}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-gray-600">
                                  {c.bait && c.bait !== '0' ? c.bait : '—'}
                                  {c.released ? ' • Released' : ''}
                                </p>
                              </div>
                            </button>
                          )
                        } else {
                          const p = item.data
                          const canDeletePost = currentUserId === p.user_id || isOwner
                          return (
                            <div key={`post-${p.id}`} className="group relative flex w-full items-start gap-3 pl-7">
                              <div className="absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-blue-500 shadow" />
                              {p.photo_url ? (
                                <img
                                  src={p.photo_url}
                                  alt="Post"
                                  className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg">
                                  💬
                                </div>
                              )}
                              <div className="flex-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-gray-700">
                                    {p.user.full_name || p.user.username}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500">
                                      {format(new Date(p.created_at), 'HH:mm')}
                                    </span>
                                    {canDeletePost && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (confirm('Delete this post?')) {
                                            try {
                                              await deletePost(p.id)
                                              toast.success('Post deleted')
                                            } catch {
                                              toast.error('Failed to delete post')
                                            }
                                          }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-opacity"
                                      >
                                        <XIcon size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {p.caption && (
                                  <p className="mt-0.5 text-[11px] text-gray-900">{p.caption}</p>
                                )}
                              </div>
                            </div>
                          )
                        }
                      })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Quick Log Button (completed sessions or fallback) */}
        {!isActive && canLogCatches && (
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
              <Map 
                catches={session.catches} 
                variant="mini" 
                center={{ lat: session.latitude, lng: session.longitude }}
                showCenterMarker
              />
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
      {isOwner && showShareModal && (
        <ShareToFeedModal
          session={session}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => {
            toast.success('Session shared to your feed!')
          }}
        />
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <InviteToSessionModal sessionId={session.id} onClose={() => setShowInviteModal(false)} />
      )}

      {/* Add post modal */}
      {showAddPostModal && session && (
        <AddSessionPostModal sessionId={session.id} onClose={() => setShowAddPostModal(false)} />
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
            navigate('/logbook')
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
            navigate('/logbook')
          } catch {
            toast.error('Failed to leave session')
          }
          setShowLeaveConfirm(false)
        }}
      />
    </main>
  )
}
