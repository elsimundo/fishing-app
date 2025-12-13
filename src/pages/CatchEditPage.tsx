import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCatch } from '../hooks/useCatch'
import { CatchForm } from '../components/catches/CatchForm'
import { ErrorState } from '../components/ui/ErrorState'

export function CatchEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: catchItem, isLoading, isError, error } = useCatch(id)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading catch</p>
        </div>
      </main>
    )
  }

  if (isError || !catchItem || !id) {
    const message = error instanceof Error ? error.message : 'Please try again in a moment.'

    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-block text-xs text-secondary hover:underline"
        >
          ← Back
        </button>
        <ErrorState title="Failed to load catch for editing" message={message} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Link to={`/catches/${id}`} className="text-secondary hover:underline">
            ← Back to catch
          </Link>
        </div>

        <section className="overflow-hidden rounded-xl bg-surface p-4 shadow">
          <h1 className="mb-3 text-base font-semibold text-foreground">Edit catch</h1>
          <CatchForm
            mode="edit"
            catchId={id}
            initialCatch={catchItem}
            onSuccess={() => {
              navigate(`/catches/${id}`)
            }}
          />
        </section>
      </div>
    </main>
  )
}
