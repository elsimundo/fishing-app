import { useNavigate } from 'react-router-dom'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { Layout } from '../components/layout/Layout'
import { useActiveCompetitions, useMyEnteredCompetitions } from '../hooks/useCompetitions'
import { CompetitionCard } from '../components/compete/CompetitionCard'
import { CompetitionCardSkeleton } from '../components/skeletons/CompetitionCardSkeleton'
import { Trophy, Plus, Target } from 'lucide-react'

function EmptyState({ type }: { type: 'yours' | 'available' }) {
  if (type === 'yours') {
    return (
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm border border-border">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-900/30">
          <Trophy size={28} className="text-amber-400" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">No active competitions</p>
        <p className="mt-1 text-xs text-muted-foreground">Join a competition below to start competing</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-card p-8 text-center shadow-sm border border-border">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background">
        <Target size={32} className="text-muted-foreground" />
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">No competitions available</p>
      <p className="mt-1 text-sm text-muted-foreground">Check back soon or create your own!</p>
    </div>
  )
}

export default function CompetePage() {
  const navigate = useNavigate()

  const {
    data: allActiveComps,
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useActiveCompetitions()

  const { data: enteredComps, isLoading: enteredLoading, refetch: refetchEntered } = useMyEnteredCompetitions()

  // Competitions the user is participating in
  const yourCompetitions = enteredComps || []

  // Competitions available to join (not already entered)
  const availableCompetitions = (allActiveComps || []).filter(
    (comp) => !yourCompetitions.some((entered) => entered.id === comp.id)
  )

  const isLoading = activeLoading || enteredLoading

  const handleRefresh = async () => {
    await Promise.all([refetchActive(), refetchEntered()])
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-24">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-border bg-card">
              <div className="flex items-center justify-between px-4 py-3">
                <h1 className="text-base font-bold text-foreground">Compete</h1>
                <button
                  type="button"
                  onClick={() => navigate('/compete/create')}
                  className="flex items-center gap-1.5 rounded-full bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-900"
                >
                  <Plus size={16} />
                  <span>Create</span>
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="space-y-6 px-4 pt-4 pb-8">
              {/* Your Competitions */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-900/30">
                    <Trophy size={14} className="text-emerald-400" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">Your Competitions</h2>
                  {yourCompetitions.length > 0 && (
                    <span className="rounded-full bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      {yourCompetitions.length}
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    <CompetitionCardSkeleton />
                    <CompetitionCardSkeleton />
                  </div>
                ) : yourCompetitions.length > 0 ? (
                  <div className="space-y-3">
                    {yourCompetitions.map((competition) => (
                      <CompetitionCard key={competition.id} competition={competition} />
                    ))}
                  </div>
                ) : (
                  <EmptyState type="yours" />
                )}
              </section>

              {/* Available Competitions */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900/30">
                    <Target size={14} className="text-blue-400" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">Available to Join</h2>
                  {availableCompetitions.length > 0 && (
                    <span className="rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-400">
                      {availableCompetitions.length}
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    <CompetitionCardSkeleton />
                    <CompetitionCardSkeleton />
                  </div>
                ) : availableCompetitions.length > 0 ? (
                  <div className="space-y-3">
                    {availableCompetitions.map((competition) => (
                      <CompetitionCard key={competition.id} competition={competition} />
                    ))}
                  </div>
                ) : (
                  <EmptyState type="available" />
                )}
              </section>
            </div>
          </div>
        </PullToRefresh>
      </div>
    </Layout>
  )
}
