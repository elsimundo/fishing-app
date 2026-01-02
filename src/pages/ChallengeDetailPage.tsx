import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, CheckCircle, Loader2, Fish } from 'lucide-react'
import { useChallenge, useUserChallenges, useChallengeCatches, useRemoveCatchFromChallenge } from '../hooks/useGamification'
import { CatchCard } from '../components/catches/CatchCard'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { toast } from 'react-hot-toast'

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
  legendary: 'bg-purple-100 text-purple-700',
}

export function ChallengeDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [catchToRemove, setCatchToRemove] = useState<{ id: string; species: string } | null>(null)

  const { data: challenge, isLoading: challengeLoading } = useChallenge(slug)
  const { data: userChallenges = [] } = useUserChallenges()
  const { mutateAsync: removeCatch, isPending: isRemoving } = useRemoveCatchFromChallenge()

  // Find user's progress on this challenge
  const userChallenge = userChallenges.find(uc => uc.challenge_id === challenge?.id)
  const { data: challengeCatches = [], isLoading: catchesLoading } = useChallengeCatches(userChallenge?.id)

  const isCompleted = !!userChallenge?.completed_at
  const progress = userChallenge?.progress || 0
  const target = userChallenge?.target || (challenge?.criteria as any)?.count || 1
  const progressPct = Math.min(100, Math.round((progress / target) * 100))

  const handleRemoveCatch = async () => {
    if (!catchToRemove || !userChallenge) return

    const catchRecord = challengeCatches.find(cc => (cc.catches as any)?.id === catchToRemove.id)
    if (!catchRecord) return

    try {
      const result = await removeCatch({
        challengeCatchId: catchRecord.id,
        userChallengeId: userChallenge.id,
      })

      if (result.wasCompleted && !result.isNowComplete) {
        toast.success('Catch removed. Badge revoked until you complete the challenge again.', { icon: '🔓' })
      } else {
        toast.success('Catch removed from challenge')
      }
    } catch (error) {
      toast.error('Failed to remove catch')
    } finally {
      setCatchToRemove(null)
    }
  }

  if (challengeLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-navy-800" />
      </main>
    )
  }

  if (!challenge) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="text-center py-10">
          <p className="text-muted-foreground">Challenge not found</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-semibold text-foreground">Challenge Details</h1>
          <div className="w-8" /> {/* Spacer */}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Challenge Card */}
        <div className="mb-6 rounded-2xl bg-card border border-border p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-3xl">
              {challenge.icon}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{challenge.title}</h2>
                {isCompleted && (
                  <CheckCircle size={20} className="text-emerald-500" />
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{challenge.description}</p>

              {/* Difficulty & XP */}
              <div className="mt-3 flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${difficultyColors[challenge.difficulty]}`}>
                  {challenge.difficulty}
                </span>
                <span className="text-sm font-semibold text-emerald-600">+{challenge.xp_reward} XP</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{progress} / {target}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-background">
              <div
                className={`h-full rounded-full transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {isCompleted && (
              <p className="mt-2 text-center text-sm font-medium text-emerald-400">
                ✓ Completed
              </p>
            )}
          </div>

          {/* How to Complete Tips */}
          {!isCompleted && (
            <div className="mt-4 rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-medium text-foreground mb-1.5">💡 How to complete:</p>
              <p className="text-xs text-muted-foreground">
                {challenge.category === 'species' && 'Log catches of different species to make progress'}
                {challenge.category === 'milestones' && 'Keep logging catches - progress tracks automatically'}
                {challenge.category === 'exploration' && 'Visit new fishing locations to unlock progress'}
                {challenge.category === 'skill' && 'Focus on technique and quality catches'}
                {!['species', 'milestones', 'exploration', 'skill'].includes(challenge.category) && 'Log catches to make progress - tracking is automatic'}
              </p>
            </div>
          )}
        </div>

        {/* Contributing Catches */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Contributing Catches ({challengeCatches.length})
          </h3>

          {catchesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : challengeCatches.length === 0 ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Fish size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No catches yet</p>
              <p className="text-xs text-muted-foreground mb-3">
                {isCompleted 
                  ? 'Catches logged before tracking was added won\'t appear here' 
                  : 'Start logging catches to track your progress'}
              </p>
              {!isCompleted && (
                <button
                  onClick={() => navigate('/catches/new')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Fish size={14} />
                  Log a catch
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {challengeCatches.map((cc) => {
                const catchData = cc.catches as any
                if (!catchData) return null

                return (
                  <div key={cc.id} className="relative">
                    <CatchCard item={catchData} />
                    
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => setCatchToRemove({ id: catchData.id, species: catchData.species })}
                      className="absolute right-2 top-2 rounded-full bg-background p-1.5 text-muted-foreground shadow-sm hover:bg-muted hover:text-red-400"
                      title="Remove from challenge"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        isOpen={!!catchToRemove}
        onCancel={() => setCatchToRemove(null)}
        onConfirm={handleRemoveCatch}
        title="Remove Catch from Challenge?"
        message={
          isCompleted
            ? `Removing this ${catchToRemove?.species || 'catch'} will revoke your badge and XP until you complete the challenge again.`
            : `Remove this ${catchToRemove?.species || 'catch'} from the challenge progress?`
        }
        confirmLabel={isRemoving ? 'Removing...' : 'Remove'}
      />
    </main>
  )
}
