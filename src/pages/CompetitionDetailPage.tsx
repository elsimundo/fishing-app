import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompetition } from '../hooks/useCompetitions'
import { useCompetitionLeaderboard, useUserEntry } from '../hooks/useCompetitionEntries'
import { useAuth } from '../hooks/useAuth'
import { useSessionParticipants } from '../hooks/useSessionParticipants'
import { CompetitionHero } from '../components/compete/CompetitionHero'
import { CompetitionInfo } from '../components/compete/CompetitionInfo'
import { CompetitionLeaderboard } from '../components/compete/CompetitionLeaderboard'
import { EnterSessionButton } from '../components/compete/EnterSessionButton'
import { ErrorState } from '../components/ui/ErrorState'
import { PendingCatchesPanel } from '../components/compete/PendingCatchesPanel'
import { MyCatchesWithStatus } from '../components/compete/MyCatchesWithStatus'
import { WinnersDisplay } from '../components/compete/WinnersDisplay'
import { DeclareWinnerModal } from '../components/compete/DeclareWinnerModal'
import { AdjustTimeModal } from '../components/compete/AdjustTimeModal'
import { CompetitionInviteModal } from '../components/compete/CompetitionInviteModal'
import { Clock, Trophy, UserPlus } from 'lucide-react'

export default function CompetitionDetailPage() {
  const { competitionId } = useParams<{ competitionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: competition, isLoading, error } = useCompetition(competitionId || '')
  const { data: entries, isLoading: leaderboardLoading } =
    useCompetitionLeaderboard(competitionId || '')
  const { data: userEntry } = useUserEntry(competitionId || '')
  const { data: participants } = useSessionParticipants(competition?.session_id ?? undefined)

  const [showDeclareWinner, setShowDeclareWinner] = useState(false)
  const [showAdjustTime, setShowAdjustTime] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'my-catches' | 'pending'>(
    'leaderboard'
  )

  const isOrganizer = competition?.created_by === user?.id
  const hasEnded = competition ? new Date(competition.ends_at) < new Date() : false
  const isParticipant = participants?.some(p => p.user_id === user?.id && p.status === 'active') ?? false

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-navy-800 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!competition) {
    const message =
      error instanceof Error ? error.message : 'This competition may have been removed or is unavailable.'

    return (
      <div className="flex h-screen flex-col items-center justify-center p-5 text-center">
        <ErrorState title="Competition not found" message={message} />
        <button
          type="button"
          onClick={() => navigate('/compete')}
          className="mt-4 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900"
        >
          Back to competitions
        </button>
      </div>
    )
  }

  const handleShare = async () => {
    const shareUrl = window.location.href
    const text = competition.description || 'Check out this competition.'

    if (navigator.share) {
      try {
        await navigator.share({ title: competition.title, text, url: shareUrl })
      } catch {
        // ignore
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl)
      // eslint-disable-next-line no-alert
      alert('Link copied to clipboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-20">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm font-semibold text-gray-700"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="text-sm font-semibold text-gray-700"
          >
            Share
          </button>
        </div>
      </div>

      <CompetitionHero competition={competition} userEntry={userEntry} />
      <CompetitionInfo competition={competition} />

      {/* Organizer Actions */}
      {isOrganizer && (
        <div className="p-5 bg-white border-b border-gray-200">
          <p className="text-sm font-semibold text-navy-800 mb-3">Organizer Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-900 flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              <span>Invite</span>
            </button>
            <button
              onClick={() => setShowAdjustTime(true)}
              className="px-4 py-2 bg-navy-100 text-navy-800 rounded-lg font-semibold hover:bg-navy-200 flex items-center justify-center gap-2"
            >
              <Clock size={16} />
              <span>Adjust Time</span>
            </button>
            <button
              onClick={() => setShowDeclareWinner(true)}
              disabled={!hasEnded}
              className="col-span-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trophy size={16} />
              <span>Declare Winner</span>
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 border-y border-gray-200 bg-white px-5 py-4">
        {competition.status === 'active' && !isParticipant && (
          <EnterSessionButton competitionId={competition.id} />
        )}
        {competition.status === 'active' && isParticipant && (
          <button
            type="button"
            onClick={() => navigate(`/catches/new?session=${competition.session_id}`)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-4 text-sm font-semibold text-white transition-colors hover:bg-navy-900"
          >
            🎣 Log a Catch
          </button>
        )}
        {competition.status === 'upcoming' && (
          <p className="text-center text-sm text-gray-600">
            Competition starts on {new Date(competition.starts_at).toLocaleDateString()}.
          </p>
        )}
        {competition.status === 'ended' && (
          <p className="text-center text-sm font-semibold text-gray-900">Competition ended</p>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 px-4 py-3 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'text-navy-800 border-b-2 border-navy-800'
                : 'text-gray-600'
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('my-catches')}
            className={`flex-1 px-4 py-3 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'my-catches'
                ? 'text-navy-800 border-b-2 border-navy-800'
                : 'text-gray-600'
            }`}
          >
            My Catches
          </button>
          {isOrganizer && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 py-3 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'text-navy-800 border-b-2 border-navy-800'
                  : 'text-gray-600'
              }`}
            >
              Pending
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === 'leaderboard' && (
          <>
            <WinnersDisplay competitionId={competition.id} isOrganizer={isOrganizer} />
            <div className="mt-6">
              <CompetitionLeaderboard
                competition={competition}
                entries={entries || []}
                isLoading={leaderboardLoading}
                userEntry={userEntry || undefined}
              />
            </div>
          </>
        )}

        {activeTab === 'my-catches' && <MyCatchesWithStatus competitionId={competition.id} />}

        {activeTab === 'pending' && isOrganizer && (
          <PendingCatchesPanel competitionId={competition.id} />
        )}
      </div>

      {/* Modals */}
      {showDeclareWinner && (
        <DeclareWinnerModal
          competitionId={competition.id}
          onClose={() => setShowDeclareWinner(false)}
        />
      )}

      {showInviteModal && (
        <CompetitionInviteModal
          competitionId={competition.id}
          competitionTitle={competition.title}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showAdjustTime && (
        <AdjustTimeModal
          competitionId={competition.id}
          currentEndsAt={competition.ends_at}
          onClose={() => setShowAdjustTime(false)}
        />
      )}
    </div>
  )
}
