import { useParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useCatch } from '../hooks/useCatch'
import { Map } from '../components/map'

export function CatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: catchItem, isLoading, isError, error } = useCatch(id)
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-slate-600">Loading catch</p>
      </main>
    )
  }

  if (isError || !catchItem) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <Link to="/dashboard" className="mb-4 inline-block text-xs text-secondary hover:underline">
          804 Back to dashboard
        </Link>
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          Failed to load catch: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </main>
    )
  }

  const dateLabel = format(new Date(catchItem.caught_at), 'd MMM yyyy, HH:mm')

  const handleDelete = async () => {
    if (!id) return

    const confirmed = window.confirm('Delete this catch? This cannot be undone.')
    if (!confirmed) return

    const { supabase } = await import('../lib/supabase')
    const { error: deleteError } = await supabase.from('catches').delete().eq('id', id)

    if (deleteError) {
      toast.error(deleteError.message)
      return
    }

    toast.success('Catch deleted')
    navigate('/dashboard')
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <Link to="/dashboard" className="text-secondary hover:underline">
            ← Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!id) return
                navigate(`/catches/${id}/edit`)
              }}
              className="rounded-md border border-slate-200 bg-surface px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                void handleDelete()
              }}
              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl bg-surface shadow">
          {catchItem.photo_url ? (
            <img
              src={catchItem.photo_url}
              alt={catchItem.species}
              className="h-60 w-full object-cover"
            />
          ) : (
            <div className="flex h-40 items-center justify-center bg-slate-100 text-xs text-slate-400">
              No photo
            </div>
          )}

          <div className="space-y-2 px-4 py-3 text-xs text-slate-700">
            <h1 className="text-lg font-semibold text-slate-900">{catchItem.species}</h1>
            <p className="text-[11px] text-slate-500">{dateLabel}</p>
            <p className="text-[11px] text-slate-600">{catchItem.location_name}</p>

            <div className="mt-2 flex flex-wrap gap-4 text-[11px]">
              {catchItem.weight_kg != null && catchItem.weight_kg > 0 && (
                <span className="font-medium">{catchItem.weight_kg.toFixed(1)} kg</span>
              )}
              {catchItem.length_cm != null && catchItem.length_cm > 0 && (
                <span>{catchItem.length_cm.toFixed(0)} cm</span>
              )}
              {catchItem.fishing_style && <span>{catchItem.fishing_style}</span>}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-surface p-3 shadow">
          <h2 className="mb-2 text-xs font-semibold text-slate-800">Location</h2>
          <div className="h-48 w-full overflow-hidden rounded-lg">
            <Map catches={[catchItem]} variant="mini" />
          </div>
        </section>

        {(catchItem.bait || catchItem.rig || catchItem.notes) && (
          <section className="overflow-hidden rounded-xl bg-surface p-3 text-xs text-slate-700 shadow">
            <h2 className="mb-2 text-xs font-semibold text-slate-800">Details</h2>
            {catchItem.bait && (
              <p className="mb-1">
                <span className="font-medium">Bait: </span>
                {catchItem.bait}
              </p>
            )}
            {catchItem.rig && (
              <p className="mb-1">
                <span className="font-medium">Rig: </span>
                {catchItem.rig}
              </p>
            )}
            {catchItem.notes && (
              <p className="whitespace-pre-wrap">
                <span className="font-medium">Notes: </span>
                {catchItem.notes}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
