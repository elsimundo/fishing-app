import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useCatch } from '../hooks/useCatch'
import { useDeleteCatch } from '../hooks/useDeleteCatch'
import { useAuth } from '../hooks/useAuth'
import type { Catch } from '../types'
import { Share2, Trash2, MoreHorizontal, Pencil, Bookmark, ArrowLeft, Zap, Fish, Camera, RotateCcw, Scale, Trophy, Star, Clock, MapPin, Calendar, FileText, Lightbulb, Thermometer, Cloud, Wind, Target, Anchor, ShieldCheck, ShieldAlert, ShieldQuestion, Shield } from 'lucide-react'
import { ShareCatchToFeedModal } from '../components/catch/ShareCatchToFeedModal'
import { ErrorState } from '../components/ui/ErrorState'
import { useSavedMarks } from '../hooks/useSavedMarks'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useWeightFormatter } from '../hooks/useWeightFormatter'
import { useSpeciesTiers, useXPSettings } from '../hooks/useAppSettings'

export function CatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { data, isLoading, isError, error } = useCatch(id)
  const { mutateAsync: deleteCatch, isPending: isDeleting } = useDeleteCatch()
  const { createMark, marks: savedMarks } = useSavedMarks()
  const [catchItem, setCatchItem] = useState<Catch | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const { formatWeight } = useWeightFormatter()
  const { data: speciesTiers } = useSpeciesTiers()
  const xpSettings = useXPSettings()

  useEffect(() => {
    if (data) setCatchItem(data)
  }, [data])

  // Auto-open share modal when arriving with ?share=1 or ?share=true
  useEffect(() => {
    const wantShare = searchParams.get('share')
    if (!wantShare) return
    const normalized = wantShare.toLowerCase()
    if (normalized !== '1' && normalized !== 'true') return
    if (!data) return

    setShowShareModal(true)
  }, [searchParams, data])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading catch…</p>
        </div>
      </main>
    )
  }

  if (isError || !catchItem) {
    const message = error instanceof Error ? error.message : 'Please try again in a moment.'

    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <ErrorState title="Failed to load catch" message={message} />
      </main>
    )
  }

  const hasWeight = catchItem.weight_kg != null
  const hasLength = catchItem.length_cm != null
  const weightLabel = hasWeight ? formatWeight(catchItem.weight_kg, { precision: 1 }) : null
  const lengthLabel = hasLength ? `${catchItem.length_cm!.toFixed(1)} cm` : null
  const timeLabel = catchItem.caught_at
    ? format(new Date(catchItem.caught_at), 'HH:mm')
    : null
  const dateLabel = catchItem.caught_at
    ? format(new Date(catchItem.caught_at), 'd MMM yyyy')
    : null

  const locationLabel = catchItem.location_name || 'Unknown location'
  
  // Build stats array - only include stats that have values
  type StatItem = { label: string; value: string; icon: React.ReactNode }
  const stats: StatItem[] = [
    hasWeight ? { label: 'Weight', value: weightLabel!, icon: <Scale size={20} className="text-muted-foreground" /> } : null,
    hasLength ? { label: 'Length', value: lengthLabel!, icon: <Scale size={20} className="text-muted-foreground" /> } : null,
    timeLabel ? { label: 'Time', value: timeLabel, icon: <Clock size={20} className="text-muted-foreground" /> } : null,
  ].filter((s): s is NonNullable<typeof s> => s !== null)
  
  // Method items - only show if they have values
  const hasBait = catchItem.bait && catchItem.bait !== '0'
  const hasRig = !!catchItem.rig
  const hasStyle = !!catchItem.fishing_style
  const hasMethod = hasBait || hasRig || hasStyle
  
  // Conditions - only show section if any exist
  const hasConditions = catchItem.weather_temp != null || catchItem.weather_condition || catchItem.wind_speed != null

  return (
    <main className="min-h-screen bg-background px-4 py-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {/* Back link */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>

        {/* Photo hero */}
        {catchItem.photo_url ? (
          <div className="relative -mx-4 -mt-4 aspect-[4/3] w-[calc(100%+2rem)] overflow-hidden sm:mx-0 sm:mt-0 sm:w-full sm:rounded-2xl">
            <img
              src={catchItem.photo_url}
              alt={catchItem.species}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-emerald-500">
            <Fish size={80} className="text-white/80" />
          </div>
        )}

        {/* Species header card */}
        <section className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">
                  {catchItem.species}
                </h1>
                {catchItem.released && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/30 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                    ✓ Released
                  </span>
                )}
                {catchItem.is_backlog && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                    <FileText size={10} /> Backlog
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground flex items-center flex-wrap gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1"><MapPin size={12} /> {locationLabel}</span>
                {dateLabel && <span className="inline-flex items-center gap-1"><Calendar size={12} /> {dateLabel}</span>}
              </p>
              {catchItem.is_backlog && (
                <p className="mt-3 rounded-lg bg-amber-900/20 border border-amber-800 px-3 py-2 text-xs text-amber-300">
                  Backlog catch — doesn't count toward XP, badges, or leaderboards.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <Share2 size={14} />
                Share
              </button>

              {/* More Menu - show for owner */}
              {user && catchItem.user_id && user.id === catchItem.user_id && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-border bg-card py-1 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false)
                            navigate(`/catches/${catchItem.id}/edit`)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                        >
                          <Pencil size={14} />
                          <span>Edit Catch</span>
                        </button>
                        {catchItem.latitude != null && catchItem.longitude != null && !savedMarks.some(m =>
                          Math.abs(m.latitude - (catchItem.latitude || 0)) < 0.001 &&
                          Math.abs(m.longitude - (catchItem.longitude || 0)) < 0.001
                        ) && (
                          <button
                            type="button"
                            onClick={() => {
                              createMark.mutate({
                                name: catchItem.location_name || catchItem.species || 'Fishing spot',
                                latitude: catchItem.latitude!,
                                longitude: catchItem.longitude!,
                                water_type: 'sea',
                                privacy_level: 'private',
                              })
                              setShowMenu(false)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                          >
                            <Bookmark size={14} />
                            <span>Save as Mark</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Delete this catch? This cannot be undone.')) return
                            try {
                              await deleteCatch(catchItem.id)
                              toast.success('Catch deleted')
                              navigate('/logbook')
                            } catch {
                              toast.error('Failed to delete catch')
                            }
                          }}
                          disabled={isDeleting}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/30 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          <span>{isDeleting ? 'Deleting...' : 'Delete Catch'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats row - only show stats that exist */}
        {stats.length > 0 && (
          <section className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-card border border-border p-4 text-center flex flex-col items-center">
                <div className="mb-1">{stat.icon}</div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </section>
        )}

        {/* XP & Verification card - only show for owner and non-backlog catches */}
        {user && catchItem.user_id === user.id && !catchItem.is_backlog && (() => {
          // Find species tier
          const tierRecord = speciesTiers?.find(t => 
            t.species.toLowerCase() === catchItem.species.toLowerCase()
          )
          const speciesTier = tierRecord?.tier || 'standard'
          const tierXP = tierRecord?.base_xp || xpSettings.tierStandard
          
          // Tier display config with Lucide icons - all muted gray for consistency
          const tierConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
            common: { label: 'Common', icon: <Fish size={14} className="text-muted-foreground" />, color: 'text-foreground' },
            standard: { label: 'Standard', icon: <Fish size={14} className="text-muted-foreground" />, color: 'text-foreground' },
            trophy: { label: 'Trophy', icon: <Trophy size={14} className="text-muted-foreground" />, color: 'text-foreground' },
            rare: { label: 'Rare', icon: <Star size={14} className="text-muted-foreground" />, color: 'text-foreground' },
          }
          const tierInfo = tierConfig[speciesTier] || tierConfig.standard
          
          // Calculate XP breakdown
          const baseXP = catchItem.photo_url ? tierXP : Math.floor(tierXP * 0.3) // 30% without photo
          const photoBonus = catchItem.photo_url ? 5 : 0
          // DB column is 'returned', type alias is 'released'
          const isReleased = catchItem.returned ?? catchItem.released
          const releaseBonus = isReleased ? 5 : 0
          const weightBonus = hasWeight ? Math.floor((catchItem.weight_kg || 0) * 2.205 / 5) * 5 : 0
          const rawTotal = baseXP + photoBonus + releaseBonus + weightBonus
          
          // Apply verification multiplier
          const level = catchItem.verification_level || 'pending'
          const multiplier = level === 'platinum' || level === 'gold' || level === 'silver' ? 1.0 
                           : level === 'bronze' ? 0.5 
                           : 0
          const totalXP = Math.floor(rawTotal * multiplier)
          
          return (
          <section className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-yellow-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">XP & Verification</h2>
            </div>
            
            {/* Verification Level */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center">
                  {level === 'platinum' ? <ShieldCheck size={20} className="text-cyan-400" /> :
                   level === 'gold' ? <ShieldCheck size={20} className="text-yellow-400" /> :
                   level === 'silver' ? <ShieldCheck size={20} className="text-gray-300" /> :
                   level === 'bronze' ? <Shield size={20} className="text-orange-400" /> :
                   level === 'pending' ? <ShieldQuestion size={20} className="text-muted-foreground" /> : 
                   <ShieldAlert size={20} className="text-red-400" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {level} Verified
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score: {catchItem.verification_score || 0}/100
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-yellow-400">
                  +{totalXP} XP
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {level === 'bronze' ? '50% multiplier' :
                   level === 'unverified' ? 'No XP (unverified)' :
                   level === 'pending' ? 'Pending verification' : '100% multiplier'}
                </p>
              </div>
            </div>
            
            {/* XP Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  {tierInfo.icon}
                  <span>{tierInfo.label} species</span>
                </span>
                <span className={tierInfo.color}>+{baseXP}</span>
              </div>
              {photoBonus > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Camera size={14} />
                    <span>Photo bonus</span>
                  </span>
                  <span className="text-foreground">+{photoBonus}</span>
                </div>
              )}
              {releaseBonus > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <RotateCcw size={14} />
                    <span>Catch & release</span>
                  </span>
                  <span className="text-foreground">+{releaseBonus}</span>
                </div>
              )}
              {weightBonus > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Scale size={14} />
                    <span>Weight bonus</span>
                  </span>
                  <span className="text-foreground">+{weightBonus}</span>
                </div>
              )}
              {multiplier < 1 && (
                <div className="flex justify-between text-muted-foreground border-t border-border pt-2 mt-2">
                  <span>Subtotal</span>
                  <span className="text-foreground">{rawTotal}</span>
                </div>
              )}
              {multiplier < 1 && multiplier > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>× {multiplier * 100}% verification</span>
                  <span className="font-medium">= {totalXP} XP</span>
                </div>
              )}
            </div>
            
            {/* Verification signals hint */}
            {(catchItem.verification_level === 'unverified' || catchItem.verification_level === 'bronze' || catchItem.verification_level === 'pending') && (
              <div className="mt-3 rounded-lg bg-amber-900/20 border border-amber-800 px-3 py-2 text-xs text-amber-300">
                <p className="font-medium mb-1 flex items-center gap-1"><Lightbulb size={12} /> Increase your verification score:</p>
                <ul className="space-y-0.5 text-amber-400">
                  {!catchItem.photo_url && <li>• Add a photo (+15 pts)</li>}
                  <li>• Enable GPS on camera (+20 pts)</li>
                  <li>• Take photo within 15 mins of catch (+15 pts)</li>
                  <li>• Use AI species identifier (+10 pts)</li>
                </ul>
              </div>
            )}
            
            {/* Badge eligibility */}
            {(catchItem.verification_level === 'gold' || catchItem.verification_level === 'platinum') && (
              <div className="mt-3 rounded-lg bg-emerald-900/20 border border-emerald-800 px-3 py-2 text-xs text-emerald-300">
                ✓ This catch is eligible for badges and challenges
              </div>
            )}
          </section>
          )
        })()}

        {/* Method card - only show if any method info exists */}
        {hasMethod && (
          <section className="rounded-2xl bg-card border border-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Method</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {hasBait && (
                <div className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <Anchor size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bait</p>
                    <p className="text-sm font-medium text-foreground">{catchItem.bait}</p>
                  </div>
                </div>
              )}
              {hasRig && (
                <div className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <Anchor size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rig</p>
                    <p className="text-sm font-medium text-foreground">{catchItem.rig}</p>
                  </div>
                </div>
              )}
              {hasStyle && (
                <div className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <Target size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Style</p>
                    <p className="text-sm font-medium text-foreground">{catchItem.fishing_style}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Conditions card - only show if any conditions exist */}
        {hasConditions && (
          <section className="rounded-2xl bg-card border border-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Conditions</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {catchItem.weather_temp != null && (
                <div className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <Thermometer size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Temperature</p>
                    <p className="text-sm font-medium text-foreground">{catchItem.weather_temp.toFixed(1)}°C</p>
                  </div>
                </div>
              )}
              {catchItem.weather_condition && (
                <div className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <Cloud size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Weather</p>
                    <p className="text-sm font-medium text-foreground">{catchItem.weather_condition}</p>
                  </div>
                </div>
              )}
              {catchItem.wind_speed != null && (
                <div className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <Wind size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Wind</p>
                    <p className="text-sm font-medium text-foreground">{catchItem.wind_speed.toFixed(1)} mph</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Notes card - only show if notes exist */}
        {catchItem.notes && (
          <section className="rounded-2xl bg-card border border-border p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</h2>
            <p className="text-sm text-foreground leading-relaxed">{catchItem.notes}</p>
          </section>
        )}

        {showShareModal && catchItem ? (
          <ShareCatchToFeedModal
            catchItem={catchItem}
            onClose={() => setShowShareModal(false)}
            onSuccess={() => {
              window.alert('Catch shared!')
            }}
          />
        ) : null}
      </div>
    </main>
  )
}
