import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Lake, Catch } from '../types'
import { Layout } from '../components/layout/Layout'
import { MapPin, ArrowLeft, Globe, Phone, Car, Coffee, Crown, BadgeCheck, Fish, Navigation, Loader2, BarChart3, Heart, Play, Users, Shield, Flag, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClaimLakeModal } from '../components/lakes/ClaimLakeModal'
import { toast } from 'react-hot-toast'
import { useSavedLakes } from '../hooks/useSavedLakes'
import { useLakeTeam, useLakeRole } from '../hooks/useLakeTeam'
import { useSubmitLakeReport, REPORT_REASON_LABELS, type LakeReportReason } from '../hooks/useLakeReports'

export default function LakeDetailPage() {
  const { slugOrId } = useParams<{ slugOrId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [lake, setLake] = useState<Lake | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // Saved lakes functionality
  const { isLakeSaved, toggleSave, isPending: isSavePending } = useSavedLakes()
  
  // Lake team/role (for showing owner/team section and dashboard access)
  const { data: userRole } = useLakeRole(lake?.id)
  const { data: teamData } = useLakeTeam(lake?.id)
  
  const canAccessDashboard = userRole === 'owner' || userRole === 'manager' || userRole === 'bailiff'

  useEffect(() => {
    if (!slugOrId) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        // Try by slug first (safe for any string)
        let { data, error } = await supabase
          .from('lakes')
          .select('*')
          .eq('slug', slugOrId)
          .maybeSingle()

        // Fallback to id if no slug match AND the value looks like a UUID
        const uuidRegex = /^[0-9a-fA-F-]{32,36}$/
        if (!data && !error && uuidRegex.test(slugOrId)) {
          const { data: byId, error: byIdErr } = await supabase
            .from('lakes')
            .select('*')
            .eq('id', slugOrId)
            .maybeSingle()
          data = byId
          error = byIdErr
        }

        if (error) throw error
        if (!data) {
          setError('Lake not found')
        } else {
          setLake(data as Lake)
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load lake')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [slugOrId])

  return (
    <Layout>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-24 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {loading && (
          <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Loading lake...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!loading && lake && (
          <div className="space-y-4">
            {/* Cover image (premium only) */}
            {lake.is_premium && lake.cover_image_url && (
              <div className="overflow-hidden rounded-2xl">
                <img
                  src={lake.cover_image_url}
                  alt={lake.name}
                  className="h-48 w-full object-cover"
                />
              </div>
            )}

            {/* Header */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground">{lake.name}</h1>
                    {lake.is_premium && (
                      <span title="Premium Venue">
                        <Crown size={18} className="text-amber-500" />
                      </span>
                    )}
                    {lake.claimed_by && !lake.is_premium && (
                      <span title="Verified Owner">
                        <BadgeCheck size={18} className="text-blue-500" />
                      </span>
                    )}
                  </div>
                  {lake.region && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={12} /> {lake.region}
                    </p>
                  )}
                  {lake.address && (
                    <p className="mt-1 text-xs text-muted-foreground">{lake.address}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {/* Save/Heart button */}
                  {user && (
                    <button
                      type="button"
                      onClick={() => toggleSave(lake.id)}
                      disabled={isSavePending}
                      className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isLakeSaved(lake.id)
                          ? 'bg-pink-900/30 text-pink-400 hover:bg-pink-900/50'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      <Heart size={14} fill={isLakeSaved(lake.id) ? 'currentColor' : 'none'} />
                      {isLakeSaved(lake.id) ? 'Saved' : 'Save'}
                    </button>
                  )}
                  {/* Owner/Team dashboard link - role-based access */}
                  {canAccessDashboard && (
                    <Link
                      to={`/lakes/${lake.id}/dashboard`}
                      className="flex items-center gap-1 rounded-lg bg-navy-800 px-3 py-2 text-xs font-medium text-white hover:bg-navy-900"
                    >
                      <BarChart3 size={14} />
                      Dashboard
                    </Link>
                  )}
                  {/* Directions button */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${lake.latitude},${lake.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80"
                  >
                    <Navigation size={14} />
                    Directions
                  </a>
                </div>
              </div>

              {/* Description (claimed lakes only) */}
              {lake.claimed_by && lake.description && (
                <p className="mt-3 text-sm text-muted-foreground">{lake.description}</p>
              )}

              {/* Pricing (claimed lakes only) */}
              {lake.claimed_by && (lake.day_ticket_price || lake.night_ticket_price) && (
                <div className="mt-3 flex flex-wrap gap-4">
                  {lake.day_ticket_price && (
                    <p className="text-sm font-semibold text-foreground">
                      Day ticket: £{lake.day_ticket_price.toFixed(2)}
                    </p>
                  )}
                  {lake.night_ticket_price && (
                    <p className="text-sm font-semibold text-foreground">
                      Night ticket: £{lake.night_ticket_price.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Facilities */}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                {lake.has_parking && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                    <Car size={12} /> Parking
                  </span>
                )}
                {lake.has_toilets && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                    🚻 Toilets
                  </span>
                )}
                {lake.has_cafe && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                    <Coffee size={12} /> Café
                  </span>
                )}
                {lake.has_tackle_shop && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                    🎣 Tackle shop
                  </span>
                )}
                {lake.is_night_fishing_allowed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                    🌙 Night fishing
                  </span>
                )}
                {lake.is_disabled_accessible && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                    ♿ Accessible
                  </span>
                )}
              </div>

              {/* Contact (claimed lakes only) */}
              {lake.claimed_by && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {lake.website && (
                    <a
                      href={lake.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-navy-800 px-3 py-1 text-xs font-semibold text-white hover:bg-navy-900"
                    >
                      <Globe size={12} /> Website
                    </a>
                  )}
                  {lake.phone && (
                    <a
                      href={`tel:${lake.phone}`}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted/80"
                    >
                      <Phone size={12} /> {lake.phone}
                    </a>
                  )}
                </div>
              )}

              {/* Start Session Here button */}
              {user && (
                <Link
                  to={`/sessions/new?lakeId=${lake.id}&lakeName=${encodeURIComponent(lake.name)}&lat=${lake.latitude}&lng=${lake.longitude}`}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-900"
                >
                  <Play size={16} />
                  Start Session Here
                </Link>
              )}

              {/* Claim CTA (unclaimed lakes) */}
              {!lake.claimed_by && user && (
                <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-900/30 p-3">
                  <p className="text-sm font-medium text-amber-400">Own or manage this venue?</p>
                  <p className="mt-1 text-xs text-amber-300">
                    Claim it to add your contact details, pricing, and more.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(true)}
                    className="mt-2 rounded-lg bg-navy-800 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-900"
                  >
                    Claim this venue
                  </button>
                </div>
              )}
            </div>

            {/* Owner & Team Section (for claimed lakes) */}
            {lake.claimed_by && teamData && (
              <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users size={16} className="text-muted-foreground" />
                  Venue Team
                </h2>
                <div className="space-y-2">
                  {/* Owner */}
                  {teamData.owner && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-900/30">
                      <div className="h-8 w-8 rounded-full bg-amber-700 flex items-center justify-center text-amber-200 font-bold text-xs">
                        {(teamData.owner as any).display_name?.[0] || (teamData.owner as any).username?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {(teamData.owner as any).display_name || (teamData.owner as any).username || 'Owner'}
                        </p>
                        <p className="text-xs text-amber-400 flex items-center gap-1">
                          <Crown size={10} /> Owner
                        </p>
                      </div>
                      <BadgeCheck size={16} className="text-blue-400" />
                    </div>
                  )}
                  {/* Team members */}
                  {teamData.team && teamData.team.length > 0 && teamData.team.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                      <div className="h-8 w-8 rounded-full bg-card flex items-center justify-center text-muted-foreground font-bold text-xs">
                        {member.profile?.display_name?.[0] || member.profile?.username?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {member.profile?.display_name || member.profile?.username || 'Team Member'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Shield size={10} />
                          {member.role === 'manager' ? 'Manager' : 'Bailiff'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community Stats */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Community Activity</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{lake.total_sessions || 0}</p>
                  <p className="text-xs text-muted-foreground">Sessions logged</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{lake.total_catches || 0}</p>
                  <p className="text-xs text-muted-foreground">Catches recorded</p>
                </div>
              </div>
            </div>

            {/* Species */}
            {lake.species && lake.species.length > 0 && (
              <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-foreground">Species</h2>
                <div className="flex flex-wrap gap-2">
                  {lake.species.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-2.5 py-1 text-[11px] font-medium text-emerald-400"
                    >
                      <Fish size={12} />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rules (claimed lakes only) */}
            {lake.claimed_by && lake.rules && (
              <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-foreground">Venue Rules</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{lake.rules}</p>
                {(lake.barbless_only || lake.catch_and_release_only || lake.max_rods) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    {lake.barbless_only && (
                      <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-red-400">
                        Barbless only
                      </span>
                    )}
                    {lake.catch_and_release_only && (
                      <span className="rounded-full bg-blue-900/30 px-2 py-0.5 text-blue-400">
                        Catch & release
                      </span>
                    )}
                    {lake.max_rods && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        Max {lake.max_rods} rods
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recent catches (claimed/premium - show last 3) */}
            {lake.claimed_by && (
              <RecentCatches lakeId={lake.id} isPremium={lake.is_premium} />
            )}

            {/* Report a Problem */}
            {user && (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground hover:bg-muted"
              >
                <Flag size={16} />
                Report a problem with this listing
              </button>
            )}
          </div>
        )}

        {/* Claim Modal */}
        {showClaimModal && lake && user && (
          <ClaimLakeModal
            lake={lake}
            userId={user.id}
            onClose={() => setShowClaimModal(false)}
            onSuccess={() => {
              setShowClaimModal(false)
              toast.success('Claim submitted! We\'ll review it within 24-48 hours.')
            }}
          />
        )}

        {/* Report Problem Modal */}
        {showReportModal && lake && user && (
          <ReportProblemModal
            lakeId={lake.id}
            lakeName={lake.name}
            onClose={() => setShowReportModal(false)}
          />
        )}
      </main>
    </Layout>
  )
}

// Report Problem Modal
function ReportProblemModal({
  lakeId,
  lakeName,
  onClose,
}: {
  lakeId: string
  lakeName: string
  onClose: () => void
}) {
  const [reason, setReason] = useState<LakeReportReason | ''>('')
  const [details, setDetails] = useState('')
  const submitReport = useSubmitLakeReport()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) {
      toast.error('Please select a reason')
      return
    }

    submitReport.mutate(
      { lakeId, reason, details },
      {
        onSuccess: () => {
          toast.success('Report submitted. Thank you for helping improve our listings!')
          onClose()
        },
        onError: () => {
          toast.error('Failed to submit report. Please try again.')
        },
      }
    )
  }

  const reasons: LakeReportReason[] = [
    'not_a_fishing_lake',
    'incorrect_info',
    'duplicate',
    'closed_permanently',
    'safety_issue',
    'access_problem',
    'inappropriate_content',
    'other',
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Report a Problem</h2>
            <p className="text-sm text-muted-foreground">{lakeName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              What's the problem?
            </label>
            <div className="space-y-2">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    reason === r
                      ? 'border-navy-800 bg-navy-50 dark:bg-navy-900/30'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="h-4 w-4 text-navy-800 focus:ring-navy-800"
                  />
                  <span className="text-sm text-foreground">{REPORT_REASON_LABELS[r]}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Additional details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide any additional information..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || submitReport.isPending}
              className="flex-1 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:bg-navy-400"
            >
              {submitReport.isPending ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Recent catches component for claimed lakes
function RecentCatches({ lakeId, isPremium }: { lakeId: string; isPremium?: boolean }) {
  const { data: catches, isLoading } = useQuery({
    queryKey: ['lake-catches', lakeId],
    queryFn: async () => {
      // Get catches from sessions at this lake
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('lake_id', lakeId)

      if (!sessions || sessions.length === 0) return []

      const sessionIds = sessions.map((s) => s.id)

      const { data, error } = await supabase
        .from('catches')
        .select(`
          id,
          species,
          weight_kg,
          length_cm,
          photo_url,
          caught_at,
          user_id
        `)
        .in('session_id', sessionIds)
        .order('caught_at', { ascending: false })
        .limit(isPremium ? 10 : 3)

      if (error) throw error
      return (data || []) as Catch[]
    },
  })

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Catches</h2>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!catches || catches.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Catches</h2>
        <p className="text-sm text-muted-foreground">No catches recorded yet at this venue.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Catches</h2>
      <div className="space-y-3">
        {catches.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg bg-background border border-border p-3">
            {c.photo_url ? (
              <img
                src={c.photo_url}
                alt={c.species}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xl">
                🐟
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{c.species}</p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                {c.weight_kg && <span>{c.weight_kg}kg</span>}
                {c.length_cm && <span>{c.length_cm}cm</span>}
                <span>·</span>
                <span>{new Date(c.caught_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!isPremium && catches.length >= 3 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Premium venues show more catches
        </p>
      )}
    </div>
  )
}
