import { useNavigate, useSearchParams } from 'react-router-dom'
import { CatchForm } from '../components/catches/CatchForm'

export default function LogCatchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="self-start text-xs text-slate-600 hover:underline"
        >
           Back
        </button>

        <section className="rounded-xl bg-white p-4 shadow">
          <h1 className="text-base font-semibold text-slate-900">Log a catch</h1>
          <p className="mt-1 text-xs text-slate-500">
            Add a new catch with species, weight, and location.
          </p>

          <div className="mt-4">
            <CatchForm
              onSuccess={() => {
                navigate(-1)
              }}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
