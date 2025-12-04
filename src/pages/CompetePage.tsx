import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { useActiveCompetitions, useUpcomingCompetitions, useMyCompetitions, useMyEnteredCompetitions } from '../hooks/useCompetitions'
import type { Competition } from '../types'
import { CompetitionCard } from '../components/compete/CompetitionCard'
import { CompetitionCardSkeleton } from '../components/skeletons/CompetitionCardSkeleton'

 type Tab = 'active' | 'upcoming' | 'mine'

function EmptyState({ tab }: { tab: Tab }) {
  const content: Record<Tab, { icon: string; title: string; description: string }> = {
    active: {
      icon: '🏆',
      title: 'No active competitions',
      description: 'Check back soon for new challenges.',
    },
    upcoming: {
      icon: '📅',
      title: 'No upcoming competitions',
      description: 'New competitions will appear here.',
    },
    mine: {
      icon: '🎣',
      title: 'No competitions yet',
      description: 'Join a competition or create your own.',
    },
  }

  const { icon, title, description } = content[tab]

  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-base font-semibold text-gray-900 mb-1">{title}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

export default function CompetePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('active')

  const {
    data: activeComps,
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useActiveCompetitions()

  const {
    data: upcomingComps,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
  } = useUpcomingCompetitions()

  const {
    data: myComps,
    isLoading: myLoading,
    refetch: refetchMy,
  } = useMyCompetitions()

  const { data: enteredComps, isLoading: enteredLoading } = useMyEnteredCompetitions()

  const myCompetitions: Competition[] = [
    ...(myComps || []),
    ...(enteredComps || []).filter((c) => !myComps?.some((mine) => mine.id === c.id)),
  ]

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: activeComps?.length || 0 },
    { id: 'upcoming', label: 'Upcoming', count: upcomingComps?.length || 0 },
    { id: 'mine', label: 'My Competitions', count: myCompetitions.length || 0 },
  ]

  const getTabContent = () => {
    switch (activeTab) {
      case 'active':
        return { competitions: activeComps, isLoading: activeLoading, refetch: refetchActive }
      case 'upcoming':
        return { competitions: upcomingComps, isLoading: upcomingLoading, refetch: refetchUpcoming }
      case 'mine':
        return {
          competitions: myCompetitions,
          isLoading: myLoading || enteredLoading,
          refetch: refetchMy,
        }
      default:
        return { competitions: [], isLoading: false, refetch: async () => {} }
    }
  }

  const { competitions, isLoading, refetch } = getTabContent()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Competitions</h1>
            <button
              type="button"
              onClick={() => navigate('/compete/create')}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 sm:px-4 sm:py-2 sm:text-sm"
            >
              + Create
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-navy-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={async () => { await refetch() }}>
        <div className="p-5 pb-24 md:pb-20">
          {isLoading ? (
            <div className="space-y-4">
              <CompetitionCardSkeleton />
              <CompetitionCardSkeleton />
              <CompetitionCardSkeleton />
            </div>
          ) : competitions && competitions.length > 0 ? (
            <div className="space-y-4">
              {competitions.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          ) : (
            <EmptyState tab={activeTab} />
          )}
        </div>
      </PullToRefresh>
    </div>
  )
}
