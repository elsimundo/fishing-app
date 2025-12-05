import { useNavigate } from 'react-router-dom'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { useActiveCompetitions, useMyEnteredCompetitions } from '../hooks/useCompetitions'
import { CompetitionCard } from '../components/compete/CompetitionCard'
import { CompetitionCardSkeleton } from '../components/skeletons/CompetitionCardSkeleton'

function EmptyState({ type }: { type: 'yours' | 'available' }) {
  if (type === 'yours') {
    return (
      <div className="text-center py-8 bg-white rounded-xl">
        <div className="text-4xl mb-2">🏆</div>
        <p className="text-sm font-semibold text-gray-900 mb-1">No active competitions</p>
        <p className="text-xs text-gray-600">Join a competition below to get started</p>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-3">🎣</div>
      <p className="text-base font-semibold text-gray-900 mb-1">No competitions available</p>
      <p className="text-sm text-gray-600">Check back soon for new challenges</p>
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
    <div className="min-h-screen bg-gray-50">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-semibold text-gray-900">Compete</h1>
                <p className="text-xs text-gray-500">Join competitions and compete with other anglers</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/compete/create')}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                + Create
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4 pb-28">
            {/* Your Competitions */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Your Competitions</h2>
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
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Available Competitions</h2>
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
  )
}
