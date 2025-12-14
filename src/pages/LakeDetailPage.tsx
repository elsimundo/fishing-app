import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Lake, Catch } from '../types'
import { Layout } from '../components/layout/Layout'
import { MapPin, ArrowLeft, Globe, Phone, Car, Coffee, Crown, BadgeCheck, Fish, Navigation, Loader2, BarChart3, Heart, Play, Users, Shield, Flag, X, Clock, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClaimLakeModal } from '../components/lakes/ClaimLakeModal'
import { toast } from 'react-hot-toast'
import { useSavedLakes } from '../hooks/useSavedLakes'
import { useLakeTeam, useLakeRole } from '../hooks/useLakeTeam'
import { useSubmitLakeReport, REPORT_REASON_LABELS, REPORT_REASON_CATEGORIES, type LakeReportReason } from '../hooks/useLakeReports'
import { useLakeAnnouncements } from '../hooks/useLakeAnnouncements'
import { useLakeStats } from '../hooks/useLakeStats'
import { useWeightFormatter } from '../hooks/useWeightFormatter'

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
  
  // Lake announcements
  const { data: announcements } = useLakeAnnouncements(lake?.id)
  
  // Lake stats (records, top anglers, etc.)
  const { data: lakeStats } = useLakeStats(lake?.id)
  const { formatWeight } = useWeightFormatter()
  
  // Lake sessions (active and recent)
  const { data: lakeSessions } = useQuery({
    queryKey: ['lake-sessions', lake?.id],
    queryFn: async () => {
      if (!lake?.id) return { active: [], recent: [] }
      
      // Get active sessions (no ended_at)
      const { data: activeSessions } = await supabase
        .from('sessions')
        .select(`
          id, title, location_name, started_at, ended_at, is_public,
          user:profiles!sessions_user_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq('lake_id', lake.id)
        .is('ended_at', null)
        .eq('is_public', true)
        .order('started_at', { ascending: false })
        .limit(10)
      
      // Get recent completed sessions
      const { data: recentSessions } = await supabase
        .from('sessions')
        .select(`
          id, title, location_name, started_at, ended_at, is_public,
          user:profiles!sessions_user_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq('lake_id', lake.id)
        .not('ended_at', 'is', null)
        .eq('is_public', true)
        .order('ended_at', { ascending: false })
        .limit(10)
      
      return {
        active: activeSessions || [],
        recent: recentSessions || [],
      }
    },
    enabled: !!lake?.id,
  })
  
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
                        {member.profile?.full_name?.[0] || member.profile?.username?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {member.profile?.full_name || member.profile?.username || 'Team Member'}
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

            {/* Announcements from Staff */}
            {announcements && announcements.length > 0 && (
              <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                  <Flag size={16} className="text-amber-500" />
                  Venue Updates
                </h2>
                <div className="space-y-3">
                  {announcements.slice(0, 3).map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`rounded-lg p-3 ${
                        announcement.is_pinned
                          ? 'bg-amber-900/20 border border-amber-500/30'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            {announcement.is_pinned && (
                              <span className="text-amber-500 text-xs">📌</span>
                            )}
                            {announcement.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                            {announcement.content}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>
                          {announcement.author?.full_name || announcement.author?.username || 'Staff'}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(announcement.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community Stats */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Community Activity</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{lakeStats?.totalSessions || lake.total_sessions || 0}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{lakeStats?.totalCatches || lake.total_catches || 0}</p>
                  <p className="text-xs text-muted-foreground">Catches</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{lakeStats?.uniqueAnglers || 0}</p>
                  <p className="text-xs text-muted-foreground">Anglers</p>
                </div>
              </div>
            </div>

            {/* Lake Record - Biggest Catch */}
            {lakeStats?.biggestCatch && (
              <div className="rounded-2xl bg-gradient-to-br from-amber-900/30 to-amber-800/10 border border-amber-500/30 p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                  <Crown size={16} className="text-amber-500" />
                  Lake Record
                </h2>
                <div className="flex items-center gap-4">
                  {lakeStats.biggestCatch.photo_url ? (
                    <img
                      src={lakeStats.biggestCatch.photo_url}
                      alt="Record catch"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-amber-900/30">
                      <Fish size={24} className="text-amber-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-lg font-bold text-foreground">
                      {formatWeight(lakeStats.biggestCatch.weight_kg, { precision: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">{lakeStats.biggestCatch.species}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {lakeStats.biggestCatch.user?.full_name || lakeStats.biggestCatch.user?.username || 'Anonymous'} ·{' '}
                      {new Date(lakeStats.biggestCatch.caught_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Anglers */}
            {lakeStats?.topAnglers && lakeStats.topAnglers.length > 0 && (
              <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users size={16} className="text-muted-foreground" />
                  Top Anglers
                </h2>
                <div className="space-y-2">
                  {lakeStats.topAnglers.slice(0, 5).map((angler, index) => (
                    <div key={angler.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-amber-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {angler.full_name || angler.username || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {angler.total_catches} catches · {angler.total_sessions} sessions
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Species Caught */}
            {lakeStats?.topSpecies && lakeStats.topSpecies.length > 0 && (
              <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                  <Fish size={16} className="text-emerald-500" />
                  Most Caught Species
                </h2>
                <div className="space-y-2">
                  {lakeStats.topSpecies.map((item, index) => (
                    <div key={item.species} className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-bold text-muted-foreground">#{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{item.species}</span>
                          <span className="text-xs text-muted-foreground">{item.count} catches</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${(item.count / lakeStats.topSpecies[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Sessions at this Lake */}
            {((lakeSessions?.active?.length ?? 0) > 0 || (lakeSessions?.recent?.length ?? 0) > 0) && (
              <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  Sessions
                </h2>

                {/* Active Sessions */}
                {(lakeSessions?.active?.length ?? 0) > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-green-500 mb-2 flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Fishing Now
                    </p>
                    <div className="space-y-2">
                      {(lakeSessions?.active ?? []).map((session: any) => (
                        <Link
                          key={session.id}
                          to={`/sessions/${session.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-green-900/20 border border-green-500/30 hover:bg-green-900/30 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-full bg-green-900/50 flex items-center justify-center text-green-400 font-bold text-xs">
                            {session.user?.full_name?.[0] || session.user?.username?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {session.user?.full_name || session.user?.username || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock size={10} />
                              Started {new Date(session.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className="text-xs text-green-400 font-medium">Live</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Sessions */}
                {(lakeSessions?.recent?.length ?? 0) > 0 && (
                  <div>
                    {(lakeSessions?.active?.length ?? 0) > 0 && (
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Sessions</p>
                    )}
                    <div className="space-y-2">
                      {(lakeSessions?.recent ?? []).slice(0, 5).map((session: any) => (
                        <Link
                          key={session.id}
                          to={`/sessions/${session.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-full bg-card flex items-center justify-center text-muted-foreground font-bold text-xs">
                            {session.user?.full_name?.[0] || session.user?.username?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {session.user?.full_name || session.user?.username || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.ended_at).toLocaleDateString('en-GB', { 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-card p-5 shadow-xl border border-border">
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
          {/* Venue Issues - most common for anglers */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
              {REPORT_REASON_CATEGORIES.venue.label}
            </label>
            <div className="space-y-1.5">
              {REPORT_REASON_CATEGORIES.venue.reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
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

          {/* Listing Issues */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
              {REPORT_REASON_CATEGORIES.listing.label}
            </label>
            <div className="space-y-1.5">
              {REPORT_REASON_CATEGORIES.listing.reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
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
                {c.weight_kg && <span>{formatWeight(c.weight_kg, { precision: 1 })}</span>}
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
