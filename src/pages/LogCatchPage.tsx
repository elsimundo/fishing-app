import { useNavigate, useLocation } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { CatchForm } from '../components/catches/CatchForm'
import { ArrowLeft, Fish } from 'lucide-react'
import type { FishIdentificationResult } from '../types/fish'
import type { PhotoMetadata } from '../utils/exifExtractor'

export default function LogCatchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get pre-filled data from Fish Identifier if available
  const state = location.state as {
    aiResult?: FishIdentificationResult
    photoFile?: File
    metadata?: PhotoMetadata
  } | null

  return (
    <Layout>
      <main className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-card">
          <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-bold text-foreground">Log a Catch</h1>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-4 py-4">
          {/* Hero */}
          <div className="mb-4 rounded-2xl bg-primary/10 p-5 text-foreground border border-primary/20 dark:border-border dark:bg-gradient-to-br dark:from-emerald-500 dark:to-cyan-600 dark:text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 dark:bg-white/20">
                <Fish size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Record Your Catch</h2>
                <p className="text-sm text-muted-foreground dark:text-white/80">Add species, weight, photo and location</p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl bg-card p-5 shadow-sm border border-border">
            <CatchForm
              onSuccess={() => {
                navigate('/logbook')
              }}
              prefilledAiResult={state?.aiResult}
              prefilledPhotoFile={state?.photoFile}
              prefilledMetadata={state?.metadata}
            />
          </div>
        </div>
      </main>
    </Layout>
  )
}
