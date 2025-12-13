import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Clock, Fish, MapPin, ChevronRight, Trophy } from 'lucide-react'
import type { SessionWithCatches } from '../../types'

type SessionCardProps = {
  session: SessionWithCatches
}

function formatDurationHours(hours: number): string {
  if (hours <= 0) return 'Just started'
  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60)
  if (whole === 0) return `${minutes}m`
  if (minutes === 0) return `${whole}h`
  return `${whole}h ${minutes}m`
}

function getWaterTypeEmoji(type: string | null): string {
  if (!type) return '🎣'
  switch (type) {
    case 'Sea/Coastal': return '🌊'
    case 'River': return '🏞️'
    case 'Lake/Reservoir': return '🏞️'
    case 'Canal': return '〰️'
    case 'Pond': return '⚫'
    default: return '🎣'
  }
}

export function SessionCard({ session }: SessionCardProps) {
  const title = session.title || session.location_name
  const dateLabel = format(new Date(session.started_at), 'd MMM yyyy')
  const durationLabel = formatDurationHours(session.stats.duration_hours)
  const waterEmoji = getWaterTypeEmoji(session.water_type)

  const totalCatches = session.stats.total_catches
  const biggest = session.stats.biggest_catch

  const isCompleted = Boolean(session.ended_at)
  const isCompetition = Boolean(session.competition_id)

  const coverPhotoUrl = session.cover_photo_url || (biggest && (biggest as any).photo_url) || null

  const hasConditions =
    session.tide_state ||
    session.weather_temp != null ||
    session.weather_condition ||
    session.wind_speed != null

  // Dynamic gradient based on status
  const headerGradient = !isCompleted
    ? 'from-emerald-500 to-teal-600'
    : isCompetition
    ? 'from-amber-500 to-orange-600'
    : 'from-slate-500 to-slate-600'

  return (
    <Link to={`/sessions/${session.id}`} className="block">
      <article className="group overflow-hidden rounded-2xl bg-card shadow-md transition-all hover:shadow-lg active:scale-[0.98] border border-border">
        {/* Colored Header */}
        <div className={`bg-gradient-to-r ${headerGradient} px-4 py-2.5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isCompleted && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  LIVE
                </span>
              )}
              {isCompetition && (
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-bold text-white">
                  <Trophy size={12} />
                  Competition
                </span>
              )}
              <span className="text-sm text-white/90">{waterEmoji} {session.water_type || 'Fishing'}</span>
            </div>
            <span className="text-xs text-white/80">{dateLabel}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex gap-3">
            {/* Photo */}
            {coverPhotoUrl && (
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-background">
                <img
                  src={coverPhotoUrl}
                  alt={title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex-1">
              {/* Title */}
              <h3 className="mb-2 text-base font-bold text-foreground leading-tight line-clamp-2">
                {title}
              </h3>

              {/* Stats */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-background px-2.5 py-1.5">
                  <Clock size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{durationLabel}</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-sky-100 dark:bg-sky-900/30 px-2.5 py-1.5">
                  <Fish size={14} className="text-sky-500 dark:text-sky-400" />
                  <span className="text-sm font-semibold text-sky-600 dark:text-sky-300">{totalCatches} {totalCatches === 1 ? 'catch' : 'catches'}</span>
                </div>
              </div>

              {/* Biggest Catch */}
              {biggest && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>🏆 Best:</span>
                  <span className="font-semibold text-foreground">{biggest.species}</span>
                  {biggest.weight_kg != null && (
                    <span className="text-emerald-400 font-medium">· {biggest.weight_kg.toFixed(1)} kg</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 border-t border-border pt-3">
            {hasConditions && (
              <p className="mb-1 text-[11px] text-muted-foreground">
                {session.tide_state && `🌊 ${session.tide_state}`}
                {session.tide_state && (session.weather_temp != null || session.weather_condition || session.wind_speed != null) && ' · '}
                {session.weather_temp != null && `${session.weather_temp.toFixed(1)}°C`}
                {session.weather_temp != null && (session.weather_condition || session.wind_speed != null) && ' · '}
                {session.weather_condition && session.weather_condition}
                {session.weather_condition && session.wind_speed != null && ' · '}
                {session.wind_speed != null && `${session.wind_speed.toFixed(1)} mph`}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin size={12} />
                <span className="line-clamp-1">{session.location_name}</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-primary group-hover:text-primary/80">
                <span>View</span>
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
