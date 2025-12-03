import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { SessionForm } from '../components/sessions/SessionForm'

export default function StartSessionPageBackup() {
  const navigate = useNavigate()

  return (
    <Layout>
      <main className="px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="self-start text-xs text-secondary hover:underline"
          >
             Back
          </button>

          <section className="rounded-xl bg-surface p-4 text-xs text-slate-700 shadow">
            <h1 className="text-base font-semibold text-slate-900">Start a session</h1>
            <p className="mt-1 text-[11px] text-slate-500">
              Set location, privacy, and notes to kick off your fishing trip.
            </p>

            <div className="mt-4">
              <SessionForm
                onSuccess={(session) => {
                  navigate(`/sessions/${session.id}`)
                }}
              />
            </div>
          </section>
        </div>
      </main>
    </Layout>
  )
}

