import { useNavigate, useParams } from 'react-router-dom'
import { useCompetition } from '../hooks/useCompetitions'
import { useCompetitionLeaderboard, useUserEntry } from '../hooks/useCompetitionEntries'
import { CompetitionHero } from '../components/compete/CompetitionHero'
import { CompetitionInfo } from '../components/compete/CompetitionInfo'
import { CompetitionLeaderboard } from '../components/compete/CompetitionLeaderboard'
import { JoinCompetitionButton } from '../components/compete/JoinCompetitionButton'
import { EnterSessionButton } from '../components/compete/EnterSessionButton'
import { ErrorState } from '../components/ui/ErrorState'

export default function CompetitionDetailPage() {
  const { competitionId } = useParams<{ competitionId: string }>()
  const navigate = useNavigate()

  const { data: competition, isLoading, error } = useCompetition(competitionId || '')
  const { data: entries, isLoading: leaderboardLoading } =
    useCompetitionLeaderboard(competitionId || '')
  const { data: userEntry } = useUserEntry(competitionId || '')

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

  const hasEntered = Boolean(userEntry)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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

      <div className="mt-4 border-y border-gray-200 bg-white px-5 py-4">
        {competition.status === 'active' && !hasEntered && (
          <JoinCompetitionButton competitionId={competition.id} />
        )}
        {competition.status === 'active' && hasEntered && (
          <EnterSessionButton competitionId={competition.id} />
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

      <CompetitionLeaderboard
        competition={competition}
        entries={entries || []}
        isLoading={leaderboardLoading}
        userEntry={userEntry || undefined}
      />
    </div>
  )
}
