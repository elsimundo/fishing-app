import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useCompetition } from '../hooks/useCompetitions'
import { useCompetitionLeaderboard, useUserEntry } from '../hooks/useCompetitionEntries'
import { useAuth } from '../hooks/useAuth'
import { useSession } from '../hooks/useSession'
import { useSessionPosts, useDeletePost } from '../hooks/usePosts'
import { AddSessionPostModal } from '../components/session/AddSessionPostModal'
import { useSessionParticipants } from '../hooks/useSessionParticipants'
import { Map } from '../components/map'
import { CatchCard } from '../components/catches/CatchCard'
import { CompetitionLeaderboard } from '../components/compete/CompetitionLeaderboard'
import { EnterSessionButton } from '../components/compete/EnterSessionButton'
import { ErrorState } from '../components/ui/ErrorState'
import { PendingCatchesPanel } from '../components/compete/PendingCatchesPanel'
import { MyCatchesWithStatus } from '../components/compete/MyCatchesWithStatus'
import { WinnersDisplay } from '../components/compete/WinnersDisplay'
import { DeclareWinnerModal } from '../components/compete/DeclareWinnerModal'
import { AdjustTimeModal } from '../components/compete/AdjustTimeModal'
import { CompetitionInviteModal } from '../components/compete/CompetitionInviteModal'
import { CompetitionAwardsCard } from '../components/compete/CompetitionAwardsCard'
import { ParticipantsList } from '../components/session/ParticipantsList'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useDeleteCompetition } from '../hooks/useDeleteCompetition'
import { toast } from 'react-hot-toast'
import { 
  ArrowLeft, Share2, MoreHorizontal, Clock, Trophy, UserPlus, Edit2, Trash2, Fish,
  MapPin, Gift, Plus, MessageSquare, X as XIcon
} from 'lucide-react'

const typeConfig: Record<string, { label: string; icon: string }> = {
  heaviest_fish: { label: 'Heaviest Fish', icon: '⚖️' },
  most_catches: { label: 'Most Catches', icon: '🔢' },
  species_diversity: { label: 'Species Diversity', icon: '🌈' },
  photo_contest: { label: 'Photo Contest', icon: '📸' },
}

function formatTimeRemaining(endsAt: string): string {
  const end = new Date(endsAt).getTime()
  const now = Date.now()
  if (Number.isNaN(end) || end <= now) return 'Ended'
  
  const diffMinutes = Math.round((end - now) / (1000 * 60))
  const hours = Math.floor(diffMinutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${diffMinutes % 60}m`
  return `${diffMinutes}m`
}

export default function CompetitionDetailPage() {
  const { competitionId } = useParams<{ competitionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: competition, isLoading, error } = useCompetition(competitionId || '')
  const { data: entries, isLoading: leaderboardLoading } =
    useCompetitionLeaderboard(competitionId || '')
  useUserEntry(competitionId || '') // Keep hook for cache
  const { data: participants } = useSessionParticipants(competition?.session_id ?? undefined)

  const [showDeclareWinner, setShowDeclareWinner] = useState(false)
  const [showAdjustTime, setShowAdjustTime] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showAddPostModal, setShowAddPostModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'my-catches' | 'catches' | 'timeline' | 'pending'>(
    'leaderboard'
  )

  // Fetch the linked session for catches/map data
  const { data: linkedSession } = useSession(competition?.session_id ?? undefined)
  const { data: sessionPosts = [] } = useSessionPosts(competition?.session_id ?? undefined)
  const { mutateAsync: deletePost } = useDeletePost()

  const deleteCompetition = useDeleteCompetition()
  const isOrganizer = competition?.created_by === user?.id
  const isActive = competition?.status === 'active'
  const isUpcoming = competition?.status === 'upcoming'
  const hasEnded = competition ? new Date(competition.ends_at) < new Date() : false
  const isParticipant = participants?.some(p => p.user_id === user?.id && p.status === 'active') ?? false
  
  const typeInfo = typeConfig[competition?.type || ''] || { label: 'Competition', icon: '🏆' }
  const timeRemaining = competition && isActive ? formatTimeRemaining(competition.ends_at) : null
  const dateLabel = competition ? format(new Date(competition.starts_at), 'd MMM yyyy') : ''
  const totalCatches = linkedSession?.catches?.length || 0

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-navy-800 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!competition) {
    const message =
      error instanceof Error ? error.message : 'This competition may have been removed or is unavailable.'

    return (
      <div className="flex h-screen flex-col items-center justify-center p-5 text-center">
        <ErrorState title="Competition not found" message={message} />
        <button
          type="button"
          onClick={() => navigate('/compete')}
          className="mt-4 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900"
        >
          Back to competitions
        </button>
      </div>
    )
  }

  const handleShare = async () => {
    const shareUrl = window.location.href
    const text = competition.description || 'Check out this competition.'

    if (navigator.share) {
      try {
        await navigator.share({ title: competition.title, text, url: shareUrl })
      } catch {
        // ignore
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl)
      // eslint-disable-next-line no-alert
      alert('Link copied to clipboard')
    }
  }

  const handleEdit = () => {
    navigate(`/compete/${competitionId}/edit`)
  }

  // Dynamic gradient based on status (matches SessionCard)
  const headerGradient = isActive
    ? 'from-amber-500 to-orange-600'
    : isUpcoming
    ? 'from-blue-500 to-indigo-600'
    : 'from-slate-500 to-slate-600'

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header - matches SessionDetailPage */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
        <div className="relative mx-auto flex max-w-2xl items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-bold text-gray-900">Competition</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            >
              <Share2 size={20} />
            </button>
            {isOrganizer && (
              <button
                type="button"
                onClick={() => setShowActions(!showActions)}
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              >
                <MoreHorizontal size={20} />
              </button>
            )}
          </div>

          {/* Actions dropdown - Organizer */}
          {showActions && isOrganizer && (
            <div className="absolute right-0 top-12 z-30 w-48 rounded-xl bg-white py-2 shadow-lg ring-1 ring-black/5">
          <button
            type="button"
            onClick={() => { setShowInviteModal(true); setShowActions(false) }}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <UserPlus size={16} />
            Invite Angler
          </button>
          <button
            type="button"
            onClick={() => { handleEdit(); setShowActions(false) }}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Edit2 size={16} />
            Edit Competition
          </button>
          <button
            type="button"
            onClick={() => { setShowAdjustTime(true); setShowActions(false) }}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Clock size={16} />
            Adjust Time
          </button>
          {hasEnded && (
            <button
              type="button"
              onClick={() => { setShowDeclareWinner(true); setShowActions(false) }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50"
            >
              <Trophy size={16} />
              Declare Winner
            </button>
          )}
          <div className="my-2 border-t border-gray-100" />
          <button
            type="button"
            onClick={() => { setShowDeleteConfirm(true); setShowActions(false) }}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
              <Trash2 size={16} />
              Delete Competition
            </button>
          </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* Hero image / cover - matches SessionDetailPage */}
        <div className="relative mb-4 overflow-hidden rounded-2xl bg-slate-900">
          {competition.cover_image_url ? (
            <img
              src={competition.cover_image_url}
              alt={competition.title}
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className={`h-64 w-full bg-gradient-to-br ${headerGradient}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />

          {/* Hero badge */}
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-navy-900 shadow-sm">
            <span>{typeInfo.icon}</span>
            <span>{typeInfo.label}</span>
            {isActive && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Live
              </span>
            )}
            {isUpcoming && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                Upcoming
              </span>
            )}
            {hasEnded && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                Ended
              </span>
            )}
          </div>

          {/* Hero stats - matches SessionDetailPage */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-2">
            <div className="flex-1 rounded-xl bg-white/95 px-3 py-2 text-center text-xs backdrop-blur">
              <p className="text-base font-bold text-slate-900">{competition.participant_count ?? 0}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Anglers</p>
            </div>
            <div className="flex-1 rounded-xl bg-white/95 px-3 py-2 text-center text-xs backdrop-blur">
              <p className="text-base font-bold text-slate-900">{timeRemaining || '—'}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Remaining</p>
            </div>
            <div className="flex-1 rounded-xl bg-white/95 px-3 py-2 text-center text-xs backdrop-blur">
              <p className="text-base font-bold text-slate-900">{totalCatches}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Catches</p>
            </div>
          </div>
        </div>

        {/* Info section - matches SessionDetailPage */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">{competition.title}</h1>
              <p className="mt-1 text-xs text-gray-500">{dateLabel}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} />
                  <span>{linkedSession?.location_name || 'Online Competition'}</span>
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                isOrganizer ? 'bg-navy-800 text-white' : isParticipant ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {isOrganizer ? 'Organizer' : isParticipant ? 'Joined' : 'Not Joined'}
              </span>
            </div>
          </div>
          {competition.description && (
            <p className="mt-3 text-sm text-slate-700">{competition.description}</p>
          )}
        </div>

        {/* Prize Banner */}
        {competition.prize && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 p-4">
            <Gift size={24} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">Prize</p>
              <p className="text-base font-bold text-amber-800">{competition.prize}</p>
            </div>
            <Trophy size={28} className="text-amber-400 flex-shrink-0" />
          </div>
        )}

        {/* Award Categories */}
        <div className="mt-4">
          <CompetitionAwardsCard competitionId={competition.id} />
        </div>

        {/* Action Button - matches SessionDetailPage CTA */}
        {isActive && !isParticipant && (
          <div className="mt-4">
            <EnterSessionButton competitionId={competition.id} />
          </div>
        )}
        {isActive && isParticipant && (
          <button
            type="button"
            onClick={() => navigate(`/catches/new?session=${competition.session_id}`)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900"
          >
            <Plus size={18} />
            Log a Catch
          </button>
        )}
        {isUpcoming && (
          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-center">
            <p className="text-sm font-medium text-blue-800">
              Competition starts on {format(new Date(competition.starts_at), 'd MMM yyyy')}
            </p>
          </div>
        )}

        {/* Participants */}
        {participants && participants.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Participants ({participants.length})</h2>
              {isOrganizer && (
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
              currentUserId={user?.id ?? null}
              myRole={isOrganizer ? 'owner' : isParticipant ? 'contributor' : null}
            />
          </div>
        )}

        {/* Map - if linked session has location */}
        {linkedSession?.latitude && linkedSession?.longitude && (
          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="h-48 w-full">
              <Map 
                catches={linkedSession.catches || []} 
                variant="mini" 
                center={{ lat: linkedSession.latitude, lng: linkedSession.longitude }}
                showCenterMarker
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-4 sticky top-[57px] z-10 rounded-t-2xl border-b border-gray-200 bg-white">
          <div className="flex">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'leaderboard'
                  ? 'border-b-2 border-navy-800 text-navy-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Trophy size={14} className="inline mr-1" />
              Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('catches')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'catches'
                  ? 'border-b-2 border-navy-800 text-navy-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Fish size={14} className="inline mr-1" />
              Catches
            </button>
            <button
              onClick={() => setActiveTab('my-catches')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'my-catches'
                  ? 'border-b-2 border-navy-800 text-navy-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Catches
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'timeline'
                  ? 'border-b-2 border-navy-800 text-navy-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare size={14} className="inline mr-1" />
              Timeline
            </button>
            {isOrganizer && (
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-navy-800 text-navy-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="rounded-b-2xl bg-white p-4 shadow-sm">
          {activeTab === 'leaderboard' && (
            <>
              <WinnersDisplay competitionId={competition.id} isOrganizer={isOrganizer} />
              <div className="mt-4">
                <CompetitionLeaderboard
                  competition={competition}
                  entries={entries || []}
                  isLoading={leaderboardLoading}
                />
              </div>
            </>
          )}

          {activeTab === 'catches' && (
            <div className="space-y-3">
              {linkedSession?.catches && linkedSession.catches.length > 0 ? (
                linkedSession.catches.map((c) => (
                  <CatchCard key={c.id} item={c} />
                ))
              ) : (
                <div className="py-6 text-center">
                  <Fish size={32} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No catches logged yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-catches' && <MyCatchesWithStatus competitionId={competition.id} />}

          {activeTab === 'timeline' && (
            <div>
              {/* Add post button */}
              {isParticipant && (
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddPostModal(true)}
                    className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <MessageSquare size={14} />
                    Add post
                  </button>
                </div>
              )}

              {/* Timeline content */}
              {linkedSession?.catches?.length === 0 && sessionPosts.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  No activity yet. Log a catch or add a post to start the timeline.
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {/* Merge catches and posts, sort by time */}
                    {[
                      ...(linkedSession?.catches || []).map((c) => ({ type: 'catch' as const, data: c, time: new Date(c.caught_at) })),
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
                          const canDeletePost = user?.id === p.user_id || isOrganizer
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
          )}

          {activeTab === 'pending' && isOrganizer && (
            <PendingCatchesPanel competitionId={competition.id} />
          )}
        </div>
      </div>

      {/* Modals */}
      {showDeclareWinner && (
        <DeclareWinnerModal
          competitionId={competition.id}
          onClose={() => setShowDeclareWinner(false)}
        />
      )}

      {showInviteModal && (
        <CompetitionInviteModal
          competitionId={competition.id}
          competitionTitle={competition.title}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showAdjustTime && (
        <AdjustTimeModal
          competitionId={competition.id}
          currentEndsAt={competition.ends_at}
          onClose={() => setShowAdjustTime(false)}
        />
      )}

      {/* Add Post Modal */}
      {showAddPostModal && competition.session_id && (
        <AddSessionPostModal 
          sessionId={competition.session_id} 
          onClose={() => setShowAddPostModal(false)} 
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete competition?"
        message="This will permanently delete this competition and all entries. This cannot be undone."
        confirmLabel={deleteCompetition.isPending ? 'Deleting…' : 'Delete'}
        cancelLabel="Cancel"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          try {
            await deleteCompetition.mutateAsync(competitionId!)
            toast.success('Competition deleted')
            navigate('/compete')
          } catch {
            toast.error('Failed to delete competition')
          }
          setShowDeleteConfirm(false)
        }}
      />
    </main>
  )
}
