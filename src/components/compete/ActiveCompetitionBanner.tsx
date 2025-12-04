import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMyCompetitions } from '../../hooks/useCompetitions'

function formatTimeRemaining(endsAt: string): string {
  const end = new Date(endsAt).getTime()
  const now = Date.now()
  if (Number.isNaN(end) || end <= now) return 'Ended'
  
  const diffMinutes = Math.round((end - now) / (1000 * 60))
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h left`
  if (hours === 0) return `${minutes}m left`
  if (minutes === 0) return `${hours}h left`
  return `${hours}h ${minutes}m left`
}

export function ActiveCompetitionBanner() {
  const { data: myCompetitions, isLoading } = useMyCompetitions()

  // Find the first active competition the user has joined
  const activeCompetition = useMemo(() => {
    if (!myCompetitions) return null
    return myCompetitions.find(comp => comp.status === 'active')
  }, [myCompetitions])

  const timeRemaining = useMemo(
    () => (activeCompetition ? formatTimeRemaining(activeCompetition.ends_at) : ''),
    [activeCompetition?.ends_at],
  )

  if (isLoading || !activeCompetition) return null

  const typeLabel = activeCompetition.type === 'heaviest_fish' 
    ? '⚖️ Heaviest fish'
    : activeCompetition.type === 'most_catches'
    ? '🔢 Most catches'
    : activeCompetition.type === 'species_diversity'
    ? '🌈 Species diversity'
    : '📸 Photo contest'

  return (
    <section className="mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 p-4 text-xs text-white shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-yellow-100">Active Competition</p>
          <p className="text-base font-semibold text-white">{activeCompetition.title}</p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live · {timeRemaining}
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">{typeLabel}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">
              {activeCompetition.participant_count ?? 0} anglers
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link
            to={`/compete/${activeCompetition.id}`}
            className="rounded-full border border-white/70 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm transition-transform hover:scale-105 hover:bg-white/20"
          >
            View
          </Link>
        </div>
      </div>
    </section>
  )
}
