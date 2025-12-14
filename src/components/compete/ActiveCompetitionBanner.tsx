import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Fish } from 'lucide-react'
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

function getCompetitionUrgency(endsAt: string): 'normal' | 'warning' | 'critical' {
  const end = new Date(endsAt).getTime()
  const hoursRemaining = (end - Date.now()) / (1000 * 60 * 60)
  if (hoursRemaining <= 1) return 'critical'
  if (hoursRemaining <= 4) return 'warning'
  return 'normal'
}

export function ActiveCompetitionBanner() {
  const { data: myCompetitions, isLoading } = useMyCompetitions()

  // Find ALL active competitions the user has joined (not ended)
  const activeCompetitions = useMemo(() => {
    if (!myCompetitions) return []
    const now = new Date()
    return myCompetitions.filter(comp => {
      const isActive = comp.status === 'active'
      const hasNotEnded = new Date(comp.ends_at) > now
      return isActive && hasNotEnded
    })
  }, [myCompetitions])

  if (isLoading || activeCompetitions.length === 0) return null

  return (
    <>
      {activeCompetitions.map(competition => {
        const timeRemaining = formatTimeRemaining(competition.ends_at)
        const urgency = getCompetitionUrgency(competition.ends_at)
        const typeLabel = competition.type === 'heaviest_fish' 
          ? '⚖️ Heaviest fish'
          : competition.type === 'most_catches'
          ? '🔢 Most catches'
          : competition.type === 'species_diversity'
          ? '🌈 Species diversity'
          : '📸 Photo contest'

        // Gradient styles based on urgency
        const gradientStyles = {
          normal: 'from-yellow-500 to-amber-600',
          warning: 'from-orange-500 to-red-500',
          critical: 'from-red-600 to-red-800',
        }

        const urgencyLabel = urgency === 'critical' 
          ? '⚠️ Ending soon!' 
          : urgency === 'warning' 
          ? '⏰ Time running out' 
          : 'Active Competition'

        return (
          <section key={competition.id} className={`mb-3 overflow-hidden rounded-2xl bg-gradient-to-br ${gradientStyles[urgency]} p-4 text-xs text-white shadow-lg`}>
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80">{urgencyLabel}</p>
                <p className="text-base font-semibold text-white">{competition.title}</p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-white">
                    <span className={`h-1.5 w-1.5 rounded-full bg-white ${urgency === 'critical' ? 'animate-ping' : 'animate-pulse'}`} />
                    Live · {timeRemaining}
                  </span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">{typeLabel}</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">
                    {competition.participant_count ?? 0} anglers
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Link
                  to={`/compete/${competition.id}`}
                  className="rounded-full border border-white/70 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm transition-transform hover:scale-105 hover:bg-white/20"
                >
                  View
                </Link>
                <Link
                  to={`/compete/${competition.id}?action=log`}
                  className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-700 shadow-sm transition-transform hover:scale-105"
                >
                  <Fish size={12} />
                  Log Catch
                </Link>
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}
