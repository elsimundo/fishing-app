import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, Settings, Share2, MessageCircle, Trash2, Fish, ChevronRight, Calendar, Trophy } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useFollowCounts } from '../hooks/useFollows'
import { useOwnPosts, useTogglePostVisibility } from '../hooks/usePosts'
import { useUnreadCount } from '../hooks/useMessages'
import { useCatches } from '../hooks/useCatches'
import { useSessions } from '../hooks/useSessions'
import { useUserXP, xpProgress } from '../hooks/useGamification'
import { useUserChallenges, useFeaturedChallenge } from '../hooks/useGamification'
import { FeedPostCard } from '../components/feed/FeedPostCard'
import { CatchCard } from '../components/catches/CatchCard'
import { XPBar } from '../components/gamification/XPBar'
import { EditProfileModal } from '../components/profile/EditProfileModal'
import { FollowersModal } from '../components/profile/FollowersModal'
import { DeleteAccountModal } from '../components/profile/DeleteAccountModal'
import { FishingPreferenceModal } from '../components/onboarding/FishingPreferenceModal'

export default function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: xpData, isLoading: xpLoading } = useUserXP()
  const { data: userChallenges = [] } = useUserChallenges()
  const { data: featuredChallenge } = useFeaturedChallenge()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreferenceModal, setShowPreferenceModal] = useState(false)
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following' | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'sessions' | 'catches' | 'achievements'>('sessions')
  const unreadCount = useUnreadCount()

  const userId = user?.id ?? ''
  const { data: followCounts } = useFollowCounts(userId)
  const { data: posts, isLoading: postsLoading } = useOwnPosts(userId)
  const { mutate: toggleVisibility } = useTogglePostVisibility()
  const { catches } = useCatches()
  const { data: sessions } = useSessions()

  const preferenceLabels: Record<string, string> = {
    sea: 'Sea Fishing',
    freshwater: 'Freshwater Fishing',
    both: 'All Fishing',
  }

  // If navigated via /logbook#settings, automatically open the settings (edit profile) modal
  useEffect(() => {
    if (location.hash === '#settings') {
      setShowEditModal(true)
    }
  }, [location.hash])

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
  const xpProg = xpProgress(xp, level)

  const completedChallenges = userChallenges.filter((uc) => uc.completed_at)
  const totalBadges = (completedChallenges.length ?? 0) + 12 // simple target for now

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
      personalBestLabel = `${heaviest.weight_kg.toFixed(1)} kg · ${heaviest.species}${lengthPart}`
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Profile</p>
          <p className="text-lg font-bold text-gray-900">@{profile.username || profile.full_name || 'angler'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <MessageCircle size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <Share2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Profile hero & gamification */}
      <div className="border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Avatar + level badge */}
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || profile.username || 'Avatar'}
                className="h-16 w-16 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-xl font-bold text-white shadow-sm">
                {(profile.full_name || profile.username || 'U')
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-xs font-bold text-white shadow">
              {level}
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">{profile.full_name || 'Angler'}</p>
              <p className="text-xs text-gray-500">@{profile.username || 'angler'}</p>
              {profile.bio && (
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{profile.bio}</p>
              )}
            </div>

            {/* Rank pill */}
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
              <span>⚡</span>
              <span>
                {level < 5
                  ? 'Beginner Angler'
                  : level < 10
                    ? 'Developing Angler'
                    : 'Seasoned Angler'}
              </span>
            </div>

            {/* XP bar inline */}
            <div className="mt-1">
              <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                <span>Level {level}</span>
                <span>
                  {xpProg.current}/{xpProg.needed} XP to level {level + 1}
                </span>
              </div>
              <XPBar showLevel={false} size="sm" />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-gray-50 px-2.5 py-2 text-center">
            <p className="text-base font-bold text-gray-900">{postCount}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Posts</p>
          </div>
          <button
            type="button"
            onClick={() => setFollowersModalTab('followers')}
            className="rounded-xl bg-gray-50 px-2.5 py-2 text-center hover:bg-gray-100"
          >
            <p className="text-base font-bold text-gray-900">{followCounts?.follower_count ?? 0}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Followers</p>
          </button>
          <button
            type="button"
            onClick={() => setFollowersModalTab('following')}
            className="rounded-xl bg-gray-50 px-2.5 py-2 text-center hover:bg-gray-100"
          >
            <p className="text-base font-bold text-gray-900">{followCounts?.following_count ?? 0}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Following</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className="rounded-xl bg-gray-50 px-2.5 py-2 text-center hover:bg-gray-100"
          >
            <p className="text-base font-bold text-gray-900">{sessionCount}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Sessions</p>
          </button>
        </div>

        {/* Badges summary */}
        <div className="mt-4 rounded-xl bg-gradient-to-br from-navy-900 to-blue-600 p-3 text-xs text-white">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold">🏆 Badges</p>
            <p className="text-[11px] text-blue-100">
              {completedChallenges.length}/{totalBadges} earned
            </p>
          </div>
          <div className="flex gap-2">
            {completedChallenges.slice(0, 3).map((uc) => (
              <div
                key={uc.id}
                className="flex-1 rounded-lg bg-white/10 p-2 text-[11px] backdrop-blur"
              >
                <div className="mb-1 text-lg">{uc.challenge?.icon || '🎣'}</div>
                <p className="font-semibold leading-tight">
                  {uc.challenge?.title || 'Challenge'}
                </p>
              </div>
            ))}
            {completedChallenges.length === 0 && (
              <p className="text-[11px] text-blue-100">
                Start logging catches and sessions to earn your first badge.
              </p>
            )}
          </div>
        </div>

        {/* Lifetime Stats */}
        <div className="mt-4 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-xs text-slate-100 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Lifetime stats</p>
              <p className="mt-1 text-sm font-semibold text-white">Your fishing at a glance</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Sessions</p>
              <p className="text-base font-semibold text-white">{sessionCount}</p>
            </div>
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Catches</p>
              <p className="text-base font-semibold text-white">{catchesCount}</p>
            </div>
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Total weight</p>
              <p className="text-base font-semibold text-white">{totalWeight.toFixed(1)} kg</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2 sm:text-xs">
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Personal best</p>
              <p className="text-[11px] font-semibold text-white sm:text-xs">{personalBestLabel}</p>
            </div>
            <div className="rounded-xl bg-white/5 px-2 py-2">
              <p className="text-[10px] text-slate-300">Top species</p>
              <p className="text-[11px] font-semibold text-white sm:text-xs">{topSpeciesLabel}</p>
            </div>
          </div>
        </div>

        {/* This week's challenge */}
        {currentChallenge && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-blue-900">🔥 This week's challenge</p>
              <span className="text-[11px] text-blue-700">{currentChallenge.difficulty}</span>
            </div>
            <p className="text-xs text-blue-900 font-medium">{currentChallenge.title}</p>
            <p className="mt-0.5 text-[11px] text-blue-800/80">
              {currentChallenge.description}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                style={{ width: `${currentChallengePct}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-blue-900/80">
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
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            ✏️ Edit profile
          </button>
          <button
            type="button"
            onClick={() => navigate('/catches/new')}
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-200"
          >
            🎣 Log catch
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 mt-2 border-b border-gray-200 bg-white">
        <div className="flex text-xs font-semibold text-gray-500">
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`flex-1 px-4 py-3 text-center ${
              activeTab === 'posts' ? 'text-navy-800' : 'text-gray-500'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <MessageCircle size={14} />
              <span>Posts</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`flex-1 px-4 py-3 text-center ${
              activeTab === 'sessions' ? 'text-navy-800' : 'text-gray-500'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Calendar size={14} />
              <span>Sessions</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catches')}
            className={`flex-1 px-4 py-3 text-center ${
              activeTab === 'catches' ? 'text-navy-800' : 'text-gray-500'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Fish size={14} />
              <span>Catches</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 px-4 py-3 text-center ${
              activeTab === 'achievements' ? 'text-navy-800' : 'text-gray-500'
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
      <div className="px-5 pb-6 pt-4">
        {/* Posts tab */}
        {activeTab === 'posts' && (
          <div>
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-navy-800" />
              </div>
            ) : !posts || (posts as any[]).length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                <p className="mb-1 font-medium text-gray-900">No posts yet</p>
                <p className="text-xs text-gray-500">Share a great session, catch, or photo from your logbook.</p>
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

        {/* Sessions tab */}
        {activeTab === 'sessions' && (
          <div>
            {!sessions || sessions.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                <p className="mb-1 font-medium text-gray-900">No sessions yet</p>
                <p className="text-xs text-gray-500">Start a session from Explore or the Logbook to track your fishing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const isActive = !session.ended_at

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      className={`w-full rounded-xl border p-3 text-left shadow-sm transition-colors ${
                        isActive
                          ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                          : 'border-gray-200 bg-white hover:border-navy-800/40'
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
                          <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                                typeof session.water_type === 'string' && (session.water_type.toLowerCase().includes('salt') || session.water_type.toLowerCase().includes('sea') || session.water_type.toLowerCase().includes('coastal'))
                                  ? isActive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-700'
                                  : isActive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {typeof session.water_type === 'string' && (session.water_type.toLowerCase().includes('salt') || session.water_type.toLowerCase().includes('sea') || session.water_type.toLowerCase().includes('coastal'))
                                ? '🌊 Saltwater'
                                : '🏞️ Freshwater'}
                            </span>
                            <div className="flex items-center gap-2">
                              {isActive && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
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
                          <p className="text-sm font-semibold text-gray-900">
                            {session.title || session.location_name || 'Fishing session'}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            📍 {session.location_name || 'Unknown location'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Catches tab */}
        {activeTab === 'catches' && (
          <div>
            {!catches || catches.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                <p className="mb-1 font-medium text-gray-900">No catches logged</p>
                <p className="text-xs text-gray-500">Log your first catch from a session or directly from the logbook.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {catches.map((c) => (
                  <CatchCard key={c.id} item={c} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Achievements tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-3">
            {userChallenges.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">
                <p className="mb-1 font-medium text-gray-900">No achievements yet</p>
                <p className="text-xs text-gray-500">Complete challenges by logging catches and sessions to unlock badges.</p>
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
                        ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-150'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                        completed ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {uc.challenge?.icon || '🎣'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {uc.challenge?.title || 'Challenge'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {uc.challenge?.description || ''}
                      </p>
                      {!completed && (
                        <div className="mt-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-0.5 text-[11px] text-gray-600">
                            {uc.progress}/{uc.target} · {pct}%
                          </p>
                        </div>
                      )}
                      {completed && (
                        <p className="mt-0.5 text-[11px] font-semibold text-emerald-800">
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
            setShowEditModal(false)
            window.location.reload()
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
    </div>
  )
}
