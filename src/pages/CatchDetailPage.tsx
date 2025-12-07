import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useCatch } from '../hooks/useCatch'
import { useDeleteCatch } from '../hooks/useDeleteCatch'
import { useAuth } from '../hooks/useAuth'
import type { Catch } from '../types'
import { Share2, Trash2, MoreHorizontal } from 'lucide-react'
import { ShareCatchToFeedModal } from '../components/catch/ShareCatchToFeedModal'
import { ErrorState } from '../components/ui/ErrorState'
import { toast } from 'react-hot-toast'

export function CatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { data, isLoading, isError, error } = useCatch(id)
  const { mutateAsync: deleteCatch, isPending: isDeleting } = useDeleteCatch()
  const [catchItem, setCatchItem] = useState<Catch | null>(null)
  const [shareMode, setShareMode] = useState<'feed' | 'profile' | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (data) setCatchItem(data)
  }, [data])

  // Auto-open share modal when arriving with ?share=1 or ?share=true
  useEffect(() => {
    const wantShare = searchParams.get('share')
    if (!wantShare) return
    const normalized = wantShare.toLowerCase()
    if (normalized !== '1' && normalized !== 'true') return
    if (!data) return

    setShareMode('feed')
  }, [searchParams, data])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-slate-600">Loading catch…</p>
        </div>
      </main>
    )
  }

  if (isError || !catchItem) {
    const message = error instanceof Error ? error.message : 'Please try again in a moment.'

    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <Link to="/sessions" className="mb-4 inline-block text-xs text-secondary hover:underline">
          Back to logbook
        </Link>
        <ErrorState title="Failed to load catch" message={message} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <Link to="/sessions" className="text-secondary hover:underline">
            Back to logbook
          </Link>
        </div>

        <section className="overflow-hidden rounded-xl bg-surface p-4 text-xs text-slate-700 shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-slate-900">{catchItem.species}</h1>
              <p className="mt-1 text-[11px] text-slate-500">
                {catchItem.location_name || 'Unknown location'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShareMode('feed')}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-surface px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                <Share2 size={14} />
                Share
              </button>
              
              {/* More Menu */}
              {user?.id === catchItem.user_id && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMenu(!showMenu)}
                    className="rounded-md border border-slate-300 bg-surface p-1.5 text-slate-700 hover:bg-slate-50"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Delete this catch? This cannot be undone.')) return
                            try {
                              await deleteCatch(catchItem.id)
                              toast.success('Catch deleted')
                              navigate('/dashboard')
                            } catch {
                              toast.error('Failed to delete catch')
                            }
                          }}
                          disabled={isDeleting}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          <span>{isDeleting ? 'Deleting...' : 'Delete Catch'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {catchItem.photo_url ? (
            <div className="mt-3 overflow-hidden rounded-lg">
              <img
                src={catchItem.photo_url}
                alt={catchItem.species}
                className="max-h-80 w-full object-cover"
              />
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4 sm:text-xs">
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] text-slate-500">Weight</p>
              <p className="text-sm font-semibold text-slate-900">
                {catchItem.weight_kg != null ? `${catchItem.weight_kg.toFixed(1)} kg` : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] text-slate-500">Length</p>
              <p className="text-sm font-semibold text-slate-900">
                {catchItem.length_cm != null ? `${catchItem.length_cm.toFixed(1)} cm` : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] text-slate-500">Bait</p>
              <p className="text-sm font-semibold text-slate-900">{catchItem.bait || '—'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] text-slate-500">Rig</p>
              <p className="text-sm font-semibold text-slate-900">{catchItem.rig || '—'}</p>
            </div>
          </div>

          {catchItem.notes ? (
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notes</p>
              <p className="mt-1">{catchItem.notes}</p>
            </div>
          ) : null}
        </section>

        {shareMode && catchItem ? (
          <ShareCatchToFeedModal
            catchItem={catchItem}
            mode={shareMode}
            onClose={() => setShareMode(null)}
            onSuccess={() => {
              if (shareMode === 'profile') {
                window.alert('Catch shared to your profile!')
              } else {
                window.alert('Catch shared to your feed!')
              }
            }}
          />
        ) : null}
      </div>
    </main>
  )
}
