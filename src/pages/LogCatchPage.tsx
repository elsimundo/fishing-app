import { useNavigate, useLocation } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { CatchForm } from '../components/catches/CatchForm'
import { ArrowLeft, Fish, Clock } from 'lucide-react'
import type { FishIdentificationResult } from '../types/fish'
import type { PhotoMetadata } from '../utils/exifExtractor'

export default function LogCatchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get pre-filled data from Fish Identifier or backlog mode
  const state = location.state as {
    aiResult?: FishIdentificationResult
    photoFile?: File
    metadata?: PhotoMetadata
    backlog?: boolean
  } | null

  const isBacklog = state?.backlog === true

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
            <h1 className="text-base font-bold text-foreground">
              {isBacklog ? 'Add Backlog Catch' : 'Log a Catch'}
            </h1>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-4 py-4">
          {/* Hero - different styling for backlog */}
          {isBacklog ? (
            <div className="mb-4 rounded-2xl bg-slate-100 p-5 text-foreground border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                  <Clock size={24} className="text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Add Backlog Catch</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Log an old catch from before you joined</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Backlog catches are for bragging rights only. They won't earn XP, badges, or count toward leaderboards.
                </p>
              </div>
            </div>
          ) : (
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
          )}

          {/* Form Card */}
          <div className="rounded-2xl bg-card p-5 shadow-sm border border-border">
            <CatchForm
              onSuccess={() => {
                navigate('/logbook')
              }}
              prefilledAiResult={state?.aiResult}
              prefilledPhotoFile={state?.photoFile}
              prefilledMetadata={state?.metadata}
              isBacklog={isBacklog}
            />
          </div>
        </div>
      </main>
    </Layout>
  )
}
