import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { CatchCard } from '../components/catches/CatchCard'
import { useCatches } from '../hooks/useCatches'
import { useSessions } from '../hooks/useSessions'
import { SessionCardSkeleton } from '../components/skeletons/SessionCardSkeleton'
import { ActiveSessionBanner } from '../components/sessions/ActiveSessionBanner'
import { ActiveCompetitionBanner } from '../components/compete/ActiveCompetitionBanner'
import { SessionCard } from '../components/sessions/SessionCard'

export function Dashboard() {
  const navigate = useNavigate()
  const { catches } = useCatches()
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
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-24 pt-3">
        <ActiveCompetitionBanner />
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

        {/* Recent Catches */}
        {recentCatches.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Recent Catches
              </p>
              {hasMoreCatches && (
                <button
                  type="button"
                  onClick={() => navigate('/catches')}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  View all
                </button>
              )}
            </div>
            <div className="space-y-2">
              {recentCatches.map((item) => (
                <CatchCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Sessions */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Sessions
            </p>
            {hasMoreSessions && (
              <button
                type="button"
                onClick={() => navigate('/sessions')}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                View all
              </button>
            )}
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
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
              {hasMoreSessions ? (
                <p className="pt-1 text-[11px] text-slate-500">
                  Showing {recentSessions.length} of {completedSessions.length} sessions
                </p>
              ) : null}
            </div>
          )}
        </section>

      </main>
    </Layout>
  )
}
