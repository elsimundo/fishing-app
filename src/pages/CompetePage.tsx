import { useNavigate } from 'react-router-dom'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { Layout } from '../components/layout/Layout'
import { useActiveCompetitions, useMyEnteredCompetitions } from '../hooks/useCompetitions'
import { CompetitionCard } from '../components/compete/CompetitionCard'
import { CompetitionCardSkeleton } from '../components/skeletons/CompetitionCardSkeleton'
import { Trophy, Plus, Users, Target } from 'lucide-react'

function EmptyState({ type }: { type: 'yours' | 'available' }) {
  if (type === 'yours') {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <Trophy size={28} className="text-amber-600" />
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-900">No active competitions</p>
        <p className="mt-1 text-xs text-gray-500">Join a competition below to start competing</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Target size={32} className="text-gray-400" />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900">No competitions available</p>
      <p className="mt-1 text-sm text-gray-500">Check back soon or create your own!</p>
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
      <div className="min-h-screen bg-gray-50 pb-24">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3">
                <h1 className="text-base font-bold text-gray-900">Compete</h1>
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

            {/* Hero */}
            <div className="p-4">
              <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Fishing Competitions</h2>
                    <p className="text-sm text-white/80">Compete with anglers worldwide</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={16} className="text-white/70" />
                    <span>{yourCompetitions.length} joined</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target size={16} className="text-white/70" />
                    <span>{availableCompetitions.length} available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6 px-4 pb-8">
              {/* Your Competitions */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                    <Trophy size={14} className="text-emerald-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">Your Competitions</h2>
                  {yourCompetitions.length > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
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
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <Target size={14} className="text-blue-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">Available to Join</h2>
                  {availableCompetitions.length > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
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
