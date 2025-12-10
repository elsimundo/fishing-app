import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useCatch } from '../hooks/useCatch'
import { useDeleteCatch } from '../hooks/useDeleteCatch'
import { useAuth } from '../hooks/useAuth'
import type { Catch } from '../types'
import { Share2, Trash2, MoreHorizontal, Pencil, Bookmark, ArrowLeft } from 'lucide-react'
import { ShareCatchToFeedModal } from '../components/catch/ShareCatchToFeedModal'
import { ErrorState } from '../components/ui/ErrorState'
import { useSavedMarks } from '../hooks/useSavedMarks'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'

export function CatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { data, isLoading, isError, error } = useCatch(id)
  const { mutateAsync: deleteCatch, isPending: isDeleting } = useDeleteCatch()
  const { createMark, marks: savedMarks } = useSavedMarks()
  const [catchItem, setCatchItem] = useState<Catch | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
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

    setShowShareModal(true)
  }, [searchParams, data])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-slate-600">Loading catch…</p>
        </div>
      </main>
    )
  }

  if (isError || !catchItem) {
    const message = error instanceof Error ? error.message : 'Please try again in a moment.'

    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1 text-xs text-navy-800 hover:underline"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <ErrorState title="Failed to load catch" message={message} />
      </main>
    )
  }

  const weightLabel =
    catchItem.weight_kg != null ? `${catchItem.weight_kg.toFixed(1)} kg` : '—'
  const lengthLabel =
    catchItem.length_cm != null ? `${catchItem.length_cm.toFixed(1)} cm` : '—'
  const timeLabel = catchItem.caught_at
    ? format(new Date(catchItem.caught_at), 'HH:mm')
    : '—'
  const dateLabel = catchItem.caught_at
    ? format(new Date(catchItem.caught_at), 'd MMM yyyy')
    : ''

  const locationLabel = catchItem.location_name || 'Unknown location'

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {/* Back link */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-navy-800 hover:underline"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>

        {/* Catch hero card */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {/* Photo */}
          {catchItem.photo_url ? (
            <div className="relative h-64 w-full overflow-hidden bg-slate-900">
              <img
                src={catchItem.photo_url}
                alt={catchItem.species}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/60" />
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center bg-gradient-to-br from-cyan-600 to-emerald-500 text-4xl">
              🐟
            </div>
          )}

          <div className="p-4 text-xs text-slate-700">
            {/* Header row: species + actions */}
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900">
                    {catchItem.species}
                  </h1>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  📍 {locationLabel}
                  {dateLabel && ` • ${dateLabel}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Share2 size={14} />
                  Share
                </button>

                {/* More Menu - show for owner */}
                {user && catchItem.user_id && user.id === catchItem.user_id && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMenu(!showMenu)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {showMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                        <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => {
                              setShowMenu(false)
                              navigate(`/catches/${catchItem.id}/edit`)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil size={14} />
                            <span>Edit Catch</span>
                          </button>
                          {catchItem.latitude != null && catchItem.longitude != null && !savedMarks.some(m =>
                            Math.abs(m.latitude - (catchItem.latitude || 0)) < 0.001 &&
                            Math.abs(m.longitude - (catchItem.longitude || 0)) < 0.001
                          ) && (
                            <button
                              type="button"
                              onClick={() => {
                                createMark.mutate({
                                  name: catchItem.location_name || catchItem.species || 'Fishing spot',
                                  latitude: catchItem.latitude!,
                                  longitude: catchItem.longitude!,
                                  water_type: 'sea', // Default to sea for catches
                                  privacy_level: 'private',
                                })
                                setShowMenu(false)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Bookmark size={14} />
                              <span>Save as Mark</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Delete this catch? This cannot be undone.')) return
                              try {
                                await deleteCatch(catchItem.id)
                                toast.success('Catch deleted')
                                navigate('/logbook')
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

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-500">Weight</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{weightLabel}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-500">Length</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{lengthLabel}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-500">Time</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{timeLabel}</p>
              </div>
            </div>

            {/* Released badge */}
            {catchItem.released && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                ✓ Released safely
              </div>
            )}

            <div className="mt-4 h-px bg-slate-200" />

            {/* Location */}
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Location</p>
              <p className="mt-1 text-sm text-slate-900">📍 {locationLabel}</p>
            </div>

            {/* Method */}
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Method</p>
              <div className="mt-1 space-y-1 text-sm text-slate-900">
                <p>
                  🎣 <span className="font-semibold">Bait:</span>{' '}
                  {catchItem.bait && catchItem.bait !== '0' ? catchItem.bait : '—'}
                </p>
                <p>
                  🪝 <span className="font-semibold">Rig:</span> {catchItem.rig || '—'}
                </p>
                {catchItem.fishing_style && (
                  <p>
                    🎯 <span className="font-semibold">Style:</span> {catchItem.fishing_style}
                  </p>
                )}
              </div>
            </div>

            {/* Conditions */}
            {(catchItem.weather_temp != null || catchItem.weather_condition || catchItem.wind_speed != null) && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Conditions</p>
                <div className="mt-1 space-y-1 text-sm text-slate-900">
                  {catchItem.weather_temp != null && (
                    <p>
                      🌡️ <span className="font-semibold">Temp:</span>{' '}
                      {catchItem.weather_temp.toFixed(1)}°C
                    </p>
                  )}
                  {catchItem.weather_condition && (
                    <p>
                      ☁️ <span className="font-semibold">Weather:</span> {catchItem.weather_condition}
                    </p>
                  )}
                  {catchItem.wind_speed != null && (
                    <p>
                      💨 <span className="font-semibold">Wind:</span>{' '}
                      {catchItem.wind_speed.toFixed(1)} mph
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {catchItem.notes && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                <p className="mt-1 text-sm text-slate-900">{catchItem.notes}</p>
              </div>
            )}
          </div>
        </section>

        {showShareModal && catchItem ? (
          <ShareCatchToFeedModal
            catchItem={catchItem}
            onClose={() => setShowShareModal(false)}
            onSuccess={() => {
              window.alert('Catch shared!')
            }}
          />
        ) : null}
      </div>
    </main>
  )
}
