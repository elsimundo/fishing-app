import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, Fish, Calendar, Trophy, Swords, Pencil, BookOpen, MessageCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useFollowCounts } from '../hooks/useFollows'
import { useOwnPosts, useTogglePostVisibility } from '../hooks/usePosts'
import { useCatches } from '../hooks/useCatches'
import { useMySessions } from '../hooks/useSessions'
import { useMyEnteredCompetitions } from '../hooks/useCompetitions'
import { useMyCompetitionPlacements } from '../hooks/useCompetitionPlacements'
import { useUserXP } from '../hooks/useGamification'
import { useUserChallenges, useFeaturedChallenge } from '../hooks/useGamification'
import { FeedPostCard } from '../components/feed/FeedPostCard'
import { CatchCard } from '../components/catches/CatchCard'
import { MultiCatchCard } from '../components/catches/MultiCatchCard'
import { ProfileHero } from '../components/profile/ProfileHero'
import { ProfileStatsGrid } from '../components/profile/ProfileStatsGrid'
import { BadgesSummaryCard } from '../components/profile/BadgesSummaryCard'
import { BadgesModal } from '../components/profile/BadgesModal'
import { LifetimeStatsCard } from '../components/profile/LifetimeStatsCard'
import { EditProfileModal } from '../components/profile/EditProfileModal'
import { FollowersModal } from '../components/profile/FollowersModal'
import { DeleteAccountModal } from '../components/profile/DeleteAccountModal'
import { FishingPreferenceModal } from '../components/onboarding/FishingPreferenceModal'
import { SpeciesCollectionTab } from '../components/profile/SpeciesCollectionTab'
import { useWeightFormatter } from '../hooks/useWeightFormatter'

type LogbookTab = 'posts' | 'sessions' | 'catches' | 'species' | 'achievements'

function isValidLogbookTab(tab: string | null): tab is LogbookTab {
  return tab === 'posts' || tab === 'sessions' || tab === 'catches' || tab === 'species' || tab === 'achievements'
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile()
  const { data: xpData, isLoading: xpLoading } = useUserXP()
  const { data: userChallenges = [] } = useUserChallenges()
  const { data: featuredChallenge } = useFeaturedChallenge()
  const { formatWeight } = useWeightFormatter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreferenceModal, setShowPreferenceModal] = useState(false)
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following' | null>(null)
  const [showBadgesModal, setShowBadgesModal] = useState(false)
  const [activeTab, setActiveTab] = useState<LogbookTab>(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    return isValidLogbookTab(tab) ? tab : 'sessions'
  })
  
  const setTab = (tab: LogbookTab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(location.search)
    if (tab === 'sessions') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }

    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
        hash: location.hash,
      },
      { replace: true }
    )
  }

  const userId = user?.id ?? ''
  const { data: followCounts } = useFollowCounts(userId)
  const { data: posts, isLoading: postsLoading } = useOwnPosts(userId)
  const { mutate: toggleVisibility } = useTogglePostVisibility()
  const { catches } = useCatches()
  const { data: sessions } = useMySessions()
  const { data: myCompetitions } = useMyEnteredCompetitions()
  const { data: competitionPlacements = [] } = useMyCompetitionPlacements()

  // If navigated via /logbook#settings, automatically open the settings (edit profile) modal
  useEffect(() => {
    if (location.hash === '#settings') {
      setShowEditModal(true)
    }
  }, [location.hash])

  // Keep tab state in sync with URL (supports browser back/forward)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')

    if (isValidLogbookTab(tab)) {
      setActiveTab(tab)
      return
    }

    // No/invalid tab param => default to sessions
    if (!tab) {
      setActiveTab('sessions')
    }
  }, [location.search])

  if (!user || profileLoading || !profile || xpLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-800" />
      </div>
    )
  }

  const postCount = (posts as unknown[] | undefined)?.length ?? 0
  const sessionCount = sessions?.length ?? 0
  const catchesCount = catches?.length ?? 0

  const xp = xpData?.xp ?? 0
  const level = xpData?.level ?? 1

  const completedChallenges = userChallenges.filter((uc) => uc.completed_at)

  // Lifetime stats calculations
  const completedSessions = sessions ?? []
  const totalWeight = completedSessions.reduce((sum, s) => sum + s.stats.total_weight_kg, 0)

  let personalBestLabel = '—'
  let topSpeciesLabel = '—'

  if (completedSessions.length > 0) {
    // Personal best: heaviest catch across all sessions
    const allCatches = completedSessions.flatMap((s) => s.catches)
    const heaviest = allCatches.reduce<null | typeof allCatches[number]>((best, c) => {
      if (c.weight_kg == null) return best
      if (!best || (best.weight_kg ?? 0) < c.weight_kg) return c
      return best
    }, null)

    if (heaviest && heaviest.weight_kg != null) {
      const lengthPart = heaviest.length_cm != null ? ` · ${heaviest.length_cm.toFixed(0)} cm` : ''
      personalBestLabel = `${formatWeight(heaviest.weight_kg, { precision: 1 })} · ${heaviest.species}${lengthPart}`
    }

    // Top species by total count across sessions
    const speciesCounts: Record<string, number> = {}
    for (const session of completedSessions) {
      for (const [species, count] of Object.entries(session.stats.species_breakdown)) {
        speciesCounts[species] = (speciesCounts[species] ?? 0) + count
      }
    }

    const sortedSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])
    if (sortedSpecies.length > 0) {
      const [name, count] = sortedSpecies[0]
      topSpeciesLabel = `${name} (${count})`
    }
  }

  const currentChallenge = featuredChallenge
  const currentChallengeProgress = currentChallenge
    ? userChallenges.find((uc) => uc.challenge_id === currentChallenge.id)
    : undefined
  const currentChallengePct = currentChallengeProgress
    ? Math.min(100, Math.round((currentChallengeProgress.progress / (currentChallengeProgress.target || 1)) * 100))
    : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Page Title (desktop only) */}
      <div className="hidden md:block border-b border-border bg-card px-5 pt-4 pb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile</p>
        <p className="text-lg font-bold text-foreground">@{profile.username || profile.full_name || 'angler'}</p>
      </div>

      {/* Profile hero & gamification */}
      <div className="border-b border-border bg-card px-5 py-4">
        <ProfileHero profile={profile} level={level} xp={xp} />

        {/* Stats grid */}
        <div className="mt-4">
          <ProfileStatsGrid
            postCount={postCount}
            followerCount={followCounts?.follower_count ?? 0}
            followingCount={followCounts?.following_count ?? 0}
            fourthStat={{ label: 'Sessions', value: sessionCount }}
            onFollowersClick={() => setFollowersModalTab('followers')}
            onFollowingClick={() => setFollowersModalTab('following')}
            onFourthClick={() => navigate('/sessions')}
          />
        </div>

        {/* Lifetime Stats */}
        <div className="mt-4">
          <LifetimeStatsCard
            sessionCount={sessionCount}
            catchesCount={catchesCount}
            totalWeightKg={totalWeight}
            personalBestLabel={personalBestLabel}
            topSpeciesLabel={topSpeciesLabel}
          />
        </div>

        {/* Badges/Achievements - below stats */}
        <div className="mt-3">
          <BadgesSummaryCard
            completedChallenges={completedChallenges}
            onClick={() => setShowBadgesModal(true)}
          />
        </div>

        {/* This week's challenge */}
        {currentChallenge && (
          <div className="mt-4 rounded-xl border border-border bg-background p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-primary">🔥 This week's challenge</p>
              <span className="text-[11px] text-muted-foreground">{currentChallenge.difficulty}</span>
            </div>
            <p className="text-xs font-medium text-foreground">{currentChallenge.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {currentChallenge.description}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                style={{ width: `${currentChallengePct}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {currentChallengeProgress
                ? `${currentChallengeProgress.progress}/${currentChallengeProgress.target} · +${currentChallenge.xp_reward} XP`
                : `0/${(currentChallenge as any).criteria?.target ?? currentChallenge.xp_reward} · +${currentChallenge.xp_reward} XP`}
            </p>
          </div>
        )}

        {/* Primary actions */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-900 disabled:bg-navy-400"
          >
            <Pencil size={16} className="mr-1.5" />
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => navigate('/catches/new')}
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <Fish size={16} className="mr-1.5" />
            Log catch
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 mt-2 border-b border-border bg-card">
        <div className="flex overflow-x-auto scrollbar-hide text-xs font-semibold text-muted-foreground md:justify-center">
          <button
            type="button"
            onClick={() => setTab('posts')}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-3 text-center ${
              activeTab === 'posts' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground/70'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <MessageCircle size={14} />
              <span>Posts</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('sessions')}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-3 text-center ${
              activeTab === 'sessions' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground/70'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Calendar size={14} />
              <span>Sessions</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('catches')}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-3 text-center ${
              activeTab === 'catches' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground/70'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Fish size={14} />
              <span>Catches</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('species')}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-3 text-center ${
              activeTab === 'species' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground/70'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <BookOpen size={14} />
              <span>Species</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('achievements')}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-3 text-center ${
              activeTab === 'achievements' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground/70'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Trophy size={14} />
              <span>Achievements</span>
            </span>
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-3 pb-6 pt-4">
        {/* Posts tab */}
        {activeTab === 'posts' && (
          <div>
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !posts || (posts as any[]).length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">No posts yet</p>
                <p className="text-xs text-muted-foreground">Share a great session, catch, or photo from your logbook.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(posts as any[]).map((post) => (
                  <FeedPostCard
                    key={post.id}
                    post={post as any}
                    showVisibility
                    onToggleVisibility={(postId, nextIsPublic) =>
                      toggleVisibility({ postId, isPublic: nextIsPublic })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sessions tab - includes both sessions and competitions */}
        {activeTab === 'sessions' && (
          <div>
            {(() => {
              // Merge sessions and competitions into a unified list
              type ListItem = 
                | { type: 'session'; data: typeof sessions extends (infer T)[] | undefined ? T : never; date: Date }
                | { type: 'competition'; data: NonNullable<typeof myCompetitions>[number]; date: Date }
              
              const items: ListItem[] = [
                ...(sessions || []).map(s => ({ 
                  type: 'session' as const, 
                  data: s, 
                  date: new Date(s.started_at) 
                })),
                ...(myCompetitions || []).map(c => ({ 
                  type: 'competition' as const, 
                  data: c, 
                  date: new Date(c.starts_at) 
                })),
              ].sort((a, b) => b.date.getTime() - a.date.getTime())

              if (items.length === 0) {
                return (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">No sessions yet</p>
                    <p className="text-xs text-muted-foreground">Start a session from Explore or the Logbook to track your fishing.</p>
                  </div>
                )
              }

              return (
                <div className="space-y-3">
                  {items.map((item) => {
                    if (item.type === 'session') {
                      const session = item.data
                      const isActive = !session.ended_at
                      const isCompetition = Boolean(session.competition_id)

                      return (
                        <button
                          key={`session-${session.id}`}
                          type="button"
                          onClick={() => navigate(`/sessions/${session.id}`)}
                          className={`w-full rounded-xl border p-3 text-left shadow-sm transition-colors ${
                            isActive
                              ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:hover:border-emerald-400'
                              : isCompetition
                              ? 'border-amber-200 bg-amber-50 hover:border-amber-300 dark:border-amber-500/40 dark:bg-amber-900/20 dark:hover:border-amber-400'
                              : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {session.cover_photo_url && (
                              <img
                                src={session.cover_photo_url}
                                alt={session.title || session.location_name || 'Session cover'}
                                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                              />
                            )}

                            <div className="flex-1">
                              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  {isCompetition && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                      <Swords size={10} />
                                      Competition
                                    </span>
                                  )}
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                                      typeof session.water_type === 'string' && (session.water_type.toLowerCase().includes('salt') || session.water_type.toLowerCase().includes('sea') || session.water_type.toLowerCase().includes('coastal'))
                                        ? 'bg-muted text-muted-foreground'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {typeof session.water_type === 'string' && (session.water_type.toLowerCase().includes('salt') || session.water_type.toLowerCase().includes('sea') || session.water_type.toLowerCase().includes('coastal'))
                                      ? '🌊 Saltwater'
                                      : '🏞️ Freshwater'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isActive && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
                                      Live
                                    </span>
                                  )}
                                  <span>
                                    {new Date(session.started_at).toLocaleDateString(undefined, {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-foreground">
                                {session.title || session.location_name || 'Fishing session'}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                📍 {session.location_name || 'Unknown location'}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    } else {
                      // Competition item
                      const competition = item.data
                      const isLive = competition.status === 'active'
                      const isUpcoming = competition.status === 'upcoming'

                      return (
                        <button
                          key={`competition-${competition.id}`}
                          type="button"
                          onClick={() => navigate(`/compete/${competition.id}`)}
                          className={`w-full rounded-xl border p-3 text-left shadow-sm transition-colors ${
                            isLive
                              ? 'border-amber-500/40 bg-amber-900/20 hover:border-amber-400'
                              : isUpcoming
                              ? 'border-blue-500/40 bg-blue-900/20 hover:border-blue-400'
                              : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {competition.cover_image_url ? (
                              <img
                                src={competition.cover_image_url}
                                alt={competition.title}
                                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                                isLive ? 'bg-amber-900/30' : isUpcoming ? 'bg-blue-900/30' : 'bg-muted'
                              }`}>
                                <Swords size={20} className={
                                  isLive ? 'text-amber-400' : isUpcoming ? 'text-blue-400' : 'text-muted-foreground'
                                } />
                              </div>
                            )}

                            <div className="flex-1">
                              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 px-2 py-0.5 font-medium text-amber-400">
                                  <Trophy size={10} />
                                  Competition
                                </span>
                                <div className="flex items-center gap-2">
                                  {isLive && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                      Live
                                    </span>
                                  )}
                                  {isUpcoming && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                                      Upcoming
                                    </span>
                                  )}
                                  <span>
                                    {new Date(competition.starts_at).toLocaleDateString(undefined, {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-foreground">
                                {competition.title}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                👥 {competition.participant_count ?? 0} anglers
                                {competition.prize && ` · 🏆 ${competition.prize}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    }
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* Catches tab */}
        {activeTab === 'catches' && (
          <div>
            {!catches || catches.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">No catches logged</p>
                <p className="text-xs text-muted-foreground">Log your first catch from a session or directly from the logbook.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  // Group catches by multi_catch_group_id
                  const grouped = new Map<string, typeof catches>()
                  const singles: typeof catches = []

                  for (const c of catches) {
                    if (c.multi_catch_group_id) {
                      if (!grouped.has(c.multi_catch_group_id)) {
                        grouped.set(c.multi_catch_group_id, [])
                      }
                      grouped.get(c.multi_catch_group_id)!.push(c)
                    } else {
                      singles.push(c)
                    }
                  }

                  // Build display items sorted by date (use first catch date for groups)
                  type DisplayItem = 
                    | { type: 'single'; catch: typeof catches[0]; date: Date }
                    | { type: 'multi'; catches: typeof catches; groupId: string; date: Date }

                  const items: DisplayItem[] = [
                    ...singles.map(c => ({ 
                      type: 'single' as const, 
                      catch: c, 
                      date: new Date(c.caught_at) 
                    })),
                    ...Array.from(grouped.entries()).map(([groupId, groupCatches]) => ({
                      type: 'multi' as const,
                      catches: groupCatches,
                      groupId,
                      date: new Date(groupCatches[0].caught_at),
                    })),
                  ].sort((a, b) => b.date.getTime() - a.date.getTime())

                  return items.map((item) => {
                    if (item.type === 'single') {
                      return <CatchCard key={item.catch.id} item={item.catch} showDelete />
                    } else {
                      return <MultiCatchCard key={item.groupId} catches={item.catches} showDelete />
                    }
                  })
                })()}
              </div>
            )}
          </div>
        )}

        {/* Species tab */}
        {activeTab === 'species' && (
          <SpeciesCollectionTab catches={catches || []} />
        )}

        {/* Achievements tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-4">
            {/* Competition Placements */}
            {competitionPlacements.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Competition Wins
                </h3>
                <div className="space-y-2">
                  {competitionPlacements.map((placement) => {
                    const positionEmoji = placement.position === 1 ? '🥇' : placement.position === 2 ? '🥈' : '🥉'
                    const positionLabel = placement.position === 1 ? '1st Place' : placement.position === 2 ? '2nd Place' : '3rd Place'
                    const bgColor = placement.position === 1 
                      ? 'border-amber-500/30 bg-amber-500/10' 
                      : placement.position === 2 
                      ? 'border-border bg-muted/40'
                      : 'border-orange-500/30 bg-orange-500/10'
                    
                    return (
                      <button
                        key={placement.competitionId}
                        type="button"
                        onClick={() => navigate(`/compete/${placement.competitionId}`)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left shadow-sm transition-colors hover:shadow-md ${bgColor}`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 text-2xl shadow-sm">
                          {positionEmoji}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{placement.competitionTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {positionLabel}
                            {placement.totalWeight ? ` · ${placement.totalWeight.toFixed(2)} kg` : ''}
                            {placement.catchCount ? ` · ${placement.catchCount} catches` : ''}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {new Date(placement.endedAt).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Challenge Badges Section */}
            {userChallenges.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Swords className="h-4 w-4 text-cyan-600" />
                  Challenge Badges
                </h3>
              </div>
            )}

            {userChallenges.length === 0 && competitionPlacements.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">No achievements yet</p>
                <p className="text-xs text-muted-foreground">Complete challenges and win competitions to unlock achievements.</p>
              </div>
            )}

            {userChallenges
              .slice()
              .sort((a, b) => (a.completed_at ? -1 : 1) - (b.completed_at ? -1 : 1))
              .map((uc) => {
                const completed = Boolean(uc.completed_at)
                const pct = Math.min(100, Math.round((uc.progress / (uc.target || 1)) * 100))
                return (
                  <button
                    key={uc.id}
                    type="button"
                    onClick={() => navigate(`/challenges/${uc.challenge?.slug}`)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm shadow-sm transition-colors ${
                      completed
                        ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
                        : 'border-border bg-card hover:bg-muted'
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                        completed ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {uc.challenge?.icon || '🎣'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {uc.challenge?.title || 'Challenge'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {uc.challenge?.description || ''}
                      </p>
                      {!completed && (
                        <div className="mt-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {uc.progress}/{uc.target} · {pct}%
                          </p>
                        </div>
                      )}
                      {completed && (
                        <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          ✓ Completed · +{uc.xp_awarded} XP
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
          </div>
        )}
      </div>

      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            refetchProfile()
            setShowEditModal(false)
          }}
        />
      )}

      {followersModalTab && (
        <FollowersModal
          userId={userId}
          initialTab={followersModalTab}
          onClose={() => setFollowersModalTab(null)}
        />
      )}

      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}

      {showPreferenceModal && (
        <FishingPreferenceModal 
          onComplete={() => {
            setShowPreferenceModal(false)
            window.location.reload()
          }} 
        />
      )}

      {showBadgesModal && (
        <BadgesModal
          completedChallenges={completedChallenges}
          onClose={() => setShowBadgesModal(false)}
          isOwnProfile
          currentStreak={profile?.current_streak ?? 0}
          longestStreak={profile?.longest_streak ?? 0}
        />
      )}
    </div>
  )
}
