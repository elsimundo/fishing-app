import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSavedMarks, useMarkShares, useLeaveMark } from '../hooks/useSavedMarks'
import { Layout } from '../components/layout/Layout'
import { CatchCard } from '../components/catches/CatchCard'
import { ShareMarkModal } from '../components/marks/ShareMarkModal'
import { ExploreMap } from '../components/map/ExploreMap'
import { ArrowLeft, Navigation, MapPin, Calendar, Fish, Clock, Share2, Trash2, Users, X, LogOut } from 'lucide-react'
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
  
  const { deleteMark, createMark } = useSavedMarks()
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
          <p className="text-sm text-gray-400">Loading mark...</p>
        </main>
      </Layout>
    )
  }

  if (!mark) {
    return (
      <Layout>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
          <p className="text-sm text-gray-400">Mark not found</p>
          <Link to="/explore" className="mt-4 text-sm text-[#1BA9A0] hover:underline">
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
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Header */}
        <div className="rounded-2xl bg-[#243B4A] border border-[#334155] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{mark.name}</h1>
              <p className="mt-1 text-sm text-gray-400">
                {mark.water_type?.charAt(0).toUpperCase()}{mark.water_type?.slice(1)} fishing spot
              </p>
            </div>
            {isOwner && (
              <span className="rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-400">
                Your mark
              </span>
            )}

      {/* Leave shared mark modal */}
      {showLeaveModal && mark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#243B4A] border border-[#334155] p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Leave this shared mark?</h2>
                <p className="mt-1 text-xs text-gray-400">
                  You&apos;ll lose access to <span className="font-semibold">{mark.name}</span>, but your
                  own sessions and catches at this spot will stay in your logbook.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSavingCopy && setShowLeaveModal(false)}
                className="rounded-full p-1 hover:bg-[#334155] disabled:opacity-50"
                disabled={isSavingCopy || leaveMark.isPending}
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => handleConfirmLeave(true)}
                disabled={isSavingCopy || leaveMark.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1BA9A0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14B8A6] disabled:bg-[#334155]"
              >
                {isSavingCopy ? 'Saving your mark…' : 'Save as my mark & leave'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmLeave(false)}
                disabled={leaveMark.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#334155] bg-[#1A2D3D] px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-[#334155] disabled:opacity-50"
              >
                {leaveMark.isPending ? 'Leaving…' : 'Just leave'}
              </button>
            </div>

            <p className="mt-3 text-center text-[11px] text-gray-500">
              Your existing sessions and catches at this location will not be deleted.
            </p>
          </div>
        </div>
      )}
          </div>

          {/* Coordinates */}
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <MapPin size={14} />
            <span>
              {mark.latitude.toFixed(5)}, {mark.longitude.toFixed(5)}
            </span>
          </div>

          {/* Map preview of this mark */}
          <div className="mt-4 h-64 overflow-hidden rounded-xl border border-[#334155]">
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
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#1A2D3D] py-2.5 text-sm font-medium text-gray-300 hover:bg-[#334155]"
            >
              <Navigation size={16} />
              Directions
            </a>
            <button
              type="button"
              onClick={() => navigate('/sessions/new', { state: { markId: mark.id, markName: mark.name } })}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#1BA9A0] py-2.5 text-sm font-medium text-white hover:bg-[#14B8A6]"
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
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#1A2D3D] py-2.5 text-sm font-medium text-gray-300 hover:bg-[#334155]"
                >
                  <Share2 size={16} />
                  Share
                </button>
                {shares.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowManageShares(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#1A2D3D] py-2.5 text-sm font-medium text-gray-300 hover:bg-[#334155]"
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
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#1A2D3D] py-2.5 text-sm font-medium text-gray-300 hover:bg-[#334155] disabled:opacity-50"
            >
              <LogOut size={16} />
              {leaveMark.isPending ? 'Leaving...' : 'Leave Shared Mark'}
            </button>
          )}

          {/* Notes */}
          {mark.notes && (
            <div className="mt-4 rounded-lg bg-[#1A2D3D] p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-300">{mark.notes}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#243B4A] border border-[#334155] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={16} />
              <span className="text-xs">Sessions</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{totalSessions}</p>
          </div>
          <div className="rounded-xl bg-[#243B4A] border border-[#334155] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Fish size={16} />
              <span className="text-xs">Catches</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{totalCatches}</p>
          </div>
        </div>

        {/* Recent Sessions */}
        {sessions && sessions.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-white mb-3">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="flex items-center justify-between rounded-xl bg-[#243B4A] border border-[#334155] p-3 shadow-sm hover:bg-[#1A2D3D]"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {session.title || session.location_name || 'Fishing session'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(session.started_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
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
            <h2 className="text-sm font-semibold text-white mb-3">Recent Catches</h2>
            <div className="space-y-3">
              {catches.slice(0, 5).map((catchItem) => (
                <CatchCard key={catchItem.id} item={catchItem} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalSessions === 0 && totalCatches === 0 && (
          <div className="mt-6 rounded-xl bg-[#243B4A] border border-[#334155] p-6 text-center">
            <span className="text-3xl">🎣</span>
            <p className="mt-2 text-sm font-medium text-gray-300">No activity yet</p>
            <p className="mt-1 text-xs text-gray-500">
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
            <div className="w-full max-w-md rounded-xl bg-[#243B4A] border border-[#334155] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#334155] px-4 py-3">
                <h3 className="text-sm font-semibold text-white">Manage Access</h3>
                <button
                  type="button"
                  onClick={() => setShowManageShares(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-4">
                {shares.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-4">
                    Not shared with anyone yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {shares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between rounded-lg bg-[#1A2D3D] p-3"
                      >
                        <div className="flex items-center gap-3">
                          {share.shared_with_user?.avatar_url ? (
                            <img
                              src={share.shared_with_user.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#334155] text-xs font-medium text-gray-300">
                              {(share.shared_with_user?.username || share.shared_with_user?.full_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">
                              {share.shared_with_user?.username || share.shared_with_user?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
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
