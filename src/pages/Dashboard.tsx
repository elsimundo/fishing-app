import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Navigation } from '../components/layout/Navigation'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CatchForm } from '../components/catches/CatchForm'
import { CatchList } from '../components/catches/CatchList'
import { CatchCard } from '../components/catches/CatchCard'
import { Map } from '../components/map'
import { useCatches } from '../hooks/useCatches'
import { useSessions } from '../hooks/useSessions'
import { SessionCardSkeleton } from '../components/skeletons/SessionCardSkeleton'
import { SessionForm } from '../components/sessions/SessionForm'
import { ActiveSessionBanner } from '../components/sessions/ActiveSessionBanner'
import { SessionCard } from '../components/sessions/SessionCard'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map')
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [isCatchSheetOpen, setIsCatchSheetOpen] = useState(false)
  const [isSessionSheetOpen, setIsSessionSheetOpen] = useState(false)
  const navigate = useNavigate()
  const { catches, isLoading, isError, error } = useCatches()
  const { data: sessions } = useSessions()

  const completedSessions = sessions ?? []
  const totalSessions = completedSessions.length
  const totalCatches = completedSessions.reduce((sum, s) => sum + s.stats.total_catches, 0)
  const totalWeight = completedSessions.reduce((sum, s) => sum + s.stats.total_weight_kg, 0)

  let personalBestLabel = '—'
  let topSpeciesLabel = '—'

  if (completedSessions.length > 0) {
    // Personal best: heaviest catch across all sessions
    const allCatches = completedSessions.flatMap((s) => s.catches)
    const heaviest = allCatches.reduce<null | typeof allCatches[number]>((best, c) => {
      if (c.weight_kg == null) return best
      if (!best || (best.weight_kg ?? 0) < c.weight_kg) return c
      return best
    }, null)

    if (heaviest && heaviest.weight_kg != null) {
      const lengthPart = heaviest.length_cm != null ? ` · ${heaviest.length_cm.toFixed(0)} cm` : ''
      personalBestLabel = `${heaviest.weight_kg.toFixed(1)} kg · ${heaviest.species}${lengthPart}`
    }

    // Top species by total count across sessions
    const speciesCounts: Record<string, number> = {}
    for (const session of completedSessions) {
      for (const [species, count] of Object.entries(session.stats.species_breakdown)) {
        speciesCounts[species] = (speciesCounts[species] ?? 0) + count
      }
    }

    const sortedSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])
    if (sortedSpecies.length > 0) {
      const [name, count] = sortedSpecies[0]
      topSpeciesLabel = `${name} (${count})`
    }
  }

  const recentSessions = completedSessions.slice(0, 3)
  const hasMoreSessions = completedSessions.length > recentSessions.length
  const recentCatches = catches.slice(0, 3)
  const hasMoreCatches = catches.length > recentCatches.length

  return (
    <Layout>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-24 pt-3">
        <ActiveSessionBanner />

        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Logbook</h1>
            <p className="text-[11px] text-slate-500">Your fishing history, stats and recent trips.</p>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-xs text-slate-100 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Lifetime stats</p>
              <p className="mt-1 text-sm font-semibold text-white">Your fishing at a glance</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Sessions</p>
              <p className="text-base font-semibold text-white">{totalSessions}</p>
            </div>
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Catches</p>
              <p className="text-base font-semibold text-white">{totalCatches}</p>
            </div>
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Total weight</p>
              <p className="text-base font-semibold text-white">{totalWeight.toFixed(1)} kg</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2 sm:text-xs">
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Personal best</p>
              <p className="text-[11px] font-semibold text-white sm:text-xs">{personalBestLabel}</p>
            </div>
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Top species</p>
              <p className="text-[11px] font-semibold text-white sm:text-xs">{topSpeciesLabel}</p>
            </div>
          </div>
        </section>

        <div className="mb-1 mt-1 flex items-center justify-between text-xs text-slate-700">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sessions</p>
          <button
            type="button"
            onClick={() => setIsSessionSheetOpen(true)}
            className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-primary/90"
          >
            Start session
          </button>
        </div>

        {activeTab === 'map' ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Map view</p>
              <button
                type="button"
                onClick={() => setIsMapExpanded((prev) => !prev)}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {isMapExpanded ? 'Collapse map' : 'Expand map'}
              </button>
            </div>
            <div
              className={`overflow-hidden rounded-xl bg-surface shadow ${
                isMapExpanded ? 'h-[70vh]' : 'h-64'
              }`}
            >
              {isLoading ? (
                <div className="flex h-full items-center justify-center border border-dashed border-slate-300 text-sm text-slate-500">
                  Loading map...
                </div>
              ) : isError ? (
                <div className="flex h-full items-center rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                  Failed to load catches: {error?.message}
                </div>
              ) : (
                <Map catches={catches} variant={isMapExpanded ? 'full' : 'mini'} />
              )}
            </div>

            {recentCatches.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Recent catches
                  </p>
                  {hasMoreCatches ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      View all
                    </button>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {recentCatches.map((item) => (
                    <CatchCard key={item.id} item={item} />
                  ))}
                  {hasMoreCatches ? (
                    <p className="pt-1 text-[11px] text-slate-500">
                      Showing {recentCatches.length} of {catches.length} catches
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Your catches</p>
            <CatchList />
          </section>
        )}

        <section className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Recent sessions</p>
            {hasMoreSessions ? (
              <button
                type="button"
                onClick={() => navigate('/sessions')}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </button>
            ) : null}
          </div>

          {!sessions ? (
            <div className="space-y-2">
              <SessionCardSkeleton />
              <SessionCardSkeleton />
            </div>
          ) : recentSessions.length === 0 ? (
            <p className="text-xs text-slate-500">
              No sessions yet — start your first fishing session to see it here.
            </p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div key={session.id} className="rounded-2xl bg-white p-3 text-xs text-slate-700 shadow-sm">
                  <SessionCard session={session} />
                </div>
              ))}
              {hasMoreSessions ? (
                <p className="pt-1 text-[11px] text-slate-500">
                  Showing {recentSessions.length} of {completedSessions.length} sessions
                </p>
              ) : null}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => setIsCatchSheetOpen(true)}
          className="fixed bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white shadow-lg shadow-emerald-500/40 hover:bg-accent/90"
          aria-label="Add catch"
        >
          +
        </button>

        <BottomSheet
          open={isCatchSheetOpen}
          title="Add catch"
          onClose={() => setIsCatchSheetOpen(false)}
        >
          <CatchForm onSuccess={() => setIsCatchSheetOpen(false)} />
        </BottomSheet>

        <BottomSheet
          open={isSessionSheetOpen}
          title="Start session"
          onClose={() => setIsSessionSheetOpen(false)}
        >
          <SessionForm onSuccess={() => setIsSessionSheetOpen(false)} />
        </BottomSheet>
      </main>
    </Layout>
  )
}
