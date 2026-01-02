import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSavedMarks, useMarkShares, useLeaveMark } from '../hooks/useSavedMarks'
import { Layout } from '../components/layout/Layout'
import { CatchCard } from '../components/catches/CatchCard'
import { ShareMarkModal } from '../components/marks/ShareMarkModal'
import { EditMarkForm } from '../components/explore/MyMarksCard'
import { ExploreMap } from '../components/map/ExploreMap'
import { ArrowLeft, Navigation, MapPin, Calendar, Fish, Clock, Share2, Trash2, Users, X, LogOut, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Session, Catch, SavedMark } from '../types'

export default function MarkDetailPage() {
  const { markId } = useParams<{ markId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showShareModal, setShowShareModal] = useState(false)
  const [showManageShares, setShowManageShares] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [isSavingCopy, setIsSavingCopy] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const { deleteMark, createMark, updateMark } = useSavedMarks()
  const { shares, removeShare } = useMarkShares(markId)
  const leaveMark = useLeaveMark()

  // Fetch mark details
  const { data: mark, isLoading: markLoading } = useQuery({
    queryKey: ['mark', markId],
    queryFn: async () => {
      if (!markId) return null
      const { data, error } = await supabase
        .from('saved_marks')
        .select('*')
        .eq('id', markId)
        .single()
      if (error) throw error
      return data as SavedMark
    },
    enabled: !!markId,
  })

  // Fetch sessions at this mark
  const { data: sessions } = useQuery({
    queryKey: ['mark-sessions', markId],
    queryFn: async () => {
      if (!markId) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, location_name, started_at, ended_at, water_type')
        .eq('mark_id', markId)
        .order('started_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as Session[]
    },
    enabled: !!markId,
  })

  // Fetch catches at this mark
  const { data: catches } = useQuery({
    queryKey: ['mark-catches', markId],
    queryFn: async () => {
      if (!markId) return []
      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .eq('mark_id', markId)
        .order('caught_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as Catch[]
    },
    enabled: !!markId,
  })

  if (markLoading) {
    return (
      <Layout>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
          <p className="text-sm text-muted-foreground">Loading mark...</p>
        </main>
      </Layout>
    )
  }

  if (!mark) {
    return (
      <Layout>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
          <p className="text-sm text-muted-foreground">Mark not found</p>
          <Link to="/explore" className="mt-4 text-sm text-primary hover:underline">
            Back to Explore
          </Link>
        </main>
      </Layout>
    )
  }

  const isOwner = mark.user_id === user?.id
  const isSharedWithMe = !isOwner && !!user
  const totalSessions = sessions?.length || 0
  const totalCatches = catches?.length || 0

  const handleDelete = async () => {
    if (!confirm('Delete this mark? This cannot be undone.')) return
    deleteMark.mutate(mark.id, {
      onSuccess: () => navigate('/explore'),
    })
  }

  const handleConfirmLeave = async (saveCopy: boolean) => {
    if (!mark || !user) return

    try {
      if (saveCopy) {
        setIsSavingCopy(true)
        await createMark.mutateAsync({
          name: mark.name,
          latitude: mark.latitude,
          longitude: mark.longitude,
          water_type: mark.water_type || undefined,
          notes: mark.notes || undefined,
          privacy_level: 'private',
        } as any)
      }

      leaveMark.mutate(mark.id, {
        onSuccess: () => {
          setShowLeaveModal(false)
          navigate('/explore')
        },
        onError: () => {
          setShowLeaveModal(false)
        },
      })
    } catch (error) {
      // createMark already toasts on error; nothing extra needed here
      console.error('Failed to save personal mark before leaving:', error)
      setIsSavingCopy(false)
    }
  }

  return (
    <Layout>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-24 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Header */}
        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{mark.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mark.water_type?.charAt(0).toUpperCase()}{mark.water_type?.slice(1)} fishing spot
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Edit mark"
                  >
                    <Edit2 size={18} />
                  </button>
                  <span className="rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-400">
                    Your mark
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && isOwner && (
            <div className="mt-4">
              <EditMarkForm
                mark={mark}
                onSubmit={(input) => {
                  updateMark.mutate(input, {
                    onSuccess: () => setIsEditing(false),
                  })
                }}
                onCancel={() => setIsEditing(false)}
                isSubmitting={updateMark.isPending}
              />
            </div>
          )}

          {/* Coordinates */}
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={14} />
            <span>
              {mark.latitude.toFixed(5)}, {mark.longitude.toFixed(5)}
            </span>
          </div>

          {/* Map preview of this mark */}
          <div className="mt-4 h-64 overflow-hidden rounded-xl border border-border">
            <ExploreMap
              markers={[
                {
                  id: mark.id,
                  type: 'mark',
                  lat: mark.latitude,
                  lng: mark.longitude,
                  title: mark.name,
                },
              ]}
              zoom={11}
            />
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${mark.latitude},${mark.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <Navigation size={16} />
              Directions
            </a>
            <button
              type="button"
              onClick={() => navigate('/sessions/new', { state: { markId: mark.id, markName: mark.name } })}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-navy-800 py-2.5 text-sm font-medium text-white hover:bg-navy-900"
            >
              <MapPin size={16} />
              Log Session
            </button>
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  <Share2 size={16} />
                  Share
                </button>
                {shares.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowManageShares(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    <Users size={16} />
                    Manage ({shares.length})
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMark.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-900/30 py-2.5 text-sm font-medium text-red-400 hover:bg-red-900/50 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleteMark.isPending ? 'Deleting...' : 'Delete Mark'}
              </button>
            </div>
          )}

          {/* Leave button - for recipients */}
          {isSharedWithMe && (
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              disabled={leaveMark.isPending}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <LogOut size={16} />
              {leaveMark.isPending ? 'Leaving...' : 'Leave Shared Mark'}
            </button>
          )}

          {/* Notes */}
          {mark.notes && (
            <div className="mt-4 rounded-lg bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-muted-foreground">{mark.notes}</p>
            </div>
          )}
        </div>

        {/* Leave shared mark modal */}
        {showLeaveModal && mark && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 shadow-xl">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Leave this shared mark?</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You&apos;ll lose access to <span className="font-semibold">{mark.name}</span>, but your
                    own sessions and catches at this spot will stay in your logbook.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !isSavingCopy && setShowLeaveModal(false)}
                  className="rounded-full p-1 hover:bg-muted disabled:opacity-50"
                  disabled={isSavingCopy || leaveMark.isPending}
                >
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => handleConfirmLeave(true)}
                  disabled={isSavingCopy || leaveMark.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
                >
                  {isSavingCopy ? 'Saving your mark…' : 'Save as my mark & leave'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmLeave(false)}
                  disabled={leaveMark.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  {leaveMark.isPending ? 'Leaving…' : 'Just leave'}
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Your existing sessions and catches at this location will not be deleted.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={16} />
              <span className="text-xs">Sessions</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalSessions}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Fish size={16} />
              <span className="text-xs">Catches</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalCatches}</p>
          </div>
        </div>

        {/* Recent Sessions */}
        {sessions && sessions.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="flex items-center justify-between rounded-xl bg-card border border-border p-3 shadow-sm hover:bg-background"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {session.title || session.location_name || 'Fishing session'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(session.started_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={12} />
                    {session.ended_at ? 'Completed' : 'Active'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Catches */}
        {catches && catches.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Catches</h2>
            <div className="space-y-3">
              {catches.slice(0, 5).map((catchItem) => (
                <CatchCard key={catchItem.id} item={catchItem} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalSessions === 0 && totalCatches === 0 && (
          <div className="mt-6 rounded-xl bg-card border border-border p-6 text-center">
            <span className="text-3xl">🎣</span>
            <p className="mt-2 text-sm font-medium text-muted-foreground">No activity yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start a session at this mark to track your catches
            </p>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && mark && (
          <ShareMarkModal
            mark={mark}
            onClose={() => setShowShareModal(false)}
          />
        )}

        {/* Manage Shares Modal */}
        {showManageShares && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-card border border-border overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Manage Access</h3>
                <button
                  type="button"
                  onClick={() => setShowManageShares(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-4">
                {shares.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Not shared with anyone yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {shares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between rounded-lg bg-background p-3"
                      >
                        <div className="flex items-center gap-3">
                          {share.shared_with_user?.avatar_url ? (
                            <img
                              src={share.shared_with_user.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                              {(share.shared_with_user?.username || share.shared_with_user?.full_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {share.shared_with_user?.username || share.shared_with_user?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Shared {format(new Date(share.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeShare.mutate(share.id)}
                          disabled={removeShare.isPending}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  )
}
