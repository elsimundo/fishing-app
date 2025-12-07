import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
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
import { useDeleteCompetition } from '../hooks/useDeleteCompetition'
import { ArrowLeft, Share2, MoreHorizontal, Clock, Trophy, UserPlus, Edit2, Trash2, Fish } from 'lucide-react'

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

  const deleteCompetition = useDeleteCompetition()
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

  const handleDelete = async () => {
    if (!competitionId) return
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this competition? This action cannot be undone.'
    )
    
    if (confirmed) {
      try {
        await deleteCompetition.mutateAsync(competitionId)
      } catch (error) {
        console.error('Failed to delete competition:', error)
        alert('Failed to delete competition. Please try again.')
      }
    }
  }

  const handleEdit = () => {
    navigate(`/compete/${competitionId}/edit`)
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-sm font-bold text-gray-900">Competition</h1>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            >
              <Share2 size={20} />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-2xl">
          <CompetitionHero competition={competition} userEntry={userEntry} />
          <CompetitionInfo competition={competition} />

          {/* Organizer Actions */}
          {isOrganizer && (
            <div className="mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100">
                  <MoreHorizontal size={14} className="text-navy-800" />
                </div>
                <p className="text-sm font-bold text-gray-900">Organizer Actions</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-900"
                >
                  <UserPlus size={16} />
                  <span>Invite</span>
                </button>
                <button
                  onClick={() => setShowAdjustTime(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  <Clock size={16} />
                  <span>Adjust Time</span>
                </button>
                <button
                  onClick={handleEdit}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  <Edit2 size={16} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteCompetition.isPending}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  <span>{deleteCompetition.isPending ? 'Deleting...' : 'Delete'}</span>
                </button>
                {hasEnded && (
                  <button
                    onClick={() => setShowDeclareWinner(true)}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    <Trophy size={16} />
                    <span>Declare Winner</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Card */}
          <div className="mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm">
            {competition.status === 'active' && !isParticipant && (
              <EnterSessionButton competitionId={competition.id} />
            )}
            {competition.status === 'active' && isParticipant && (
              <button
                type="button"
                onClick={() => navigate(`/catches/new?session=${competition.session_id}`)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-4 text-sm font-bold text-white transition-colors hover:bg-navy-900"
              >
                <Fish size={18} />
                <span>Log a Catch</span>
              </button>
            )}
            {competition.status === 'upcoming' && (
              <div className="rounded-xl bg-blue-50 p-4 text-center">
                <p className="text-sm font-medium text-blue-800">
                  Competition starts on {new Date(competition.starts_at).toLocaleDateString()}
                </p>
              </div>
            )}
            {competition.status === 'ended' && (
              <div className="rounded-xl bg-gray-100 p-4 text-center">
                <p className="text-sm font-semibold text-gray-700">Competition has ended</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="sticky top-[57px] z-10 border-b border-gray-200 bg-white">
            <div className="flex">
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'leaderboard'
                    ? 'border-b-2 border-navy-800 text-navy-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Leaderboard
              </button>
              <button
                onClick={() => setActiveTab('my-catches')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'my-catches'
                    ? 'border-b-2 border-navy-800 text-navy-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Catches
              </button>
              {isOrganizer && (
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                    activeTab === 'pending'
                      ? 'border-b-2 border-navy-800 text-navy-800'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pending
                </button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'leaderboard' && (
              <>
                <WinnersDisplay competitionId={competition.id} isOrganizer={isOrganizer} />
                <div className="mt-4">
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
    </Layout>
  )
}
