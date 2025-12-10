import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { CatchForm } from '../components/catches/CatchForm'
import { ArrowLeft, Fish } from 'lucide-react'

export default function LogCatchPage() {
  const navigate = useNavigate()

  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-bold text-gray-900">Log a Catch</h1>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-4 py-4">
          {/* Hero */}
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Fish size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Record Your Catch</h2>
                <p className="text-sm text-white/80">Add species, weight, photo and location</p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <CatchForm
              onSuccess={() => {
                navigate('/logbook')
              }}
            />
          </div>
        </div>
      </main>
    </Layout>
  )
}
