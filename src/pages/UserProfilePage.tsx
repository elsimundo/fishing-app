import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, MessageCircle, Fish, Calendar, Share2, Trophy } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFollowCounts, useIsFollowing } from '../hooks/useFollows'
import { useUserPosts } from '../hooks/usePosts'
import { useStartConversation } from '../hooks/useMessages'
import { usePublicUserSessions, usePublicUserChallenges, calculateLifetimeStats } from '../hooks/usePublicProfileStats'
import { FeedPostCard } from '../components/feed/FeedPostCard'
import { FollowButton } from '../components/profile/FollowButton'
import { FollowersModal } from '../components/profile/FollowersModal'
import { CatchCard } from '../components/catches/CatchCard'
import { ProfileHero } from '../components/profile/ProfileHero'
import { ProfileStatsGrid } from '../components/profile/ProfileStatsGrid'
import { BadgesSummaryCard } from '../components/profile/BadgesSummaryCard'
import { BadgesModal } from '../components/profile/BadgesModal'
import { LifetimeStatsCard } from '../components/profile/LifetimeStatsCard'
import type { Profile, Catch } from '../types'
import { normalizeUsername } from '../utils/validation'

export default function UserProfilePage() {
  const { userId, username } = useParams<{ userId?: string; username?: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following' | null>(null)
  const [showBadgesModal, setShowBadgesModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'sessions' | 'catches' | 'achievements'>('sessions')
  const { mutate: startConversation, isPending: isStartingConversation } = useStartConversation()

  const profileKey = userId ?? username ?? null

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['profile', profileKey],
    queryFn: async () => {
      if (!profileKey) return null

      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        return data
      }

      const normalized = normalizeUsername(username ?? '')
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', normalized)
        .single()

      if (error) throw error
      return data
    },
    enabled: Boolean(profileKey),
  })

  const profileId = profile?.id ?? userId ?? ''

  const { data: followCounts } = useFollowCounts(profileId)
  const { data: posts, isLoading: postsLoading } = useUserPosts(profileId)
  const { data: isFollowing } = useIsFollowing(profileId)

  // Fetch user's public catches
  const { data: catches, isLoading: catchesLoading } = useQuery<Catch[]>({
    queryKey: ['user-catches', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .eq('user_id', profileId)
        .eq('is_public', true)
        .order('caught_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(profileId),
  })

  // Fetch user's public sessions for lifetime stats and sessions tab
  const { data: userSessions, isLoading: sessionsLoading } = usePublicUserSessions(profileId)

  // Fetch user's completed challenges for badges
  const { data: userChallenges } = usePublicUserChallenges(profileId)

  const isOwnProfile = currentUser?.id === profileId

  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-5 text-center bg-background">
        <p className="mb-2 text-lg font-semibold text-foreground">User not found</p>
        <p className="text-sm text-muted-foreground">This profile does not exist or has been deleted.</p>
      </div>
    )
  }

  const postCount = (posts as unknown[] | undefined)?.length ?? 0

  const xp = (profile as any).xp ?? 0
  const level = (profile as any).level ?? 1
  const completedChallenges = userChallenges ?? []

  // Calculate lifetime stats from public sessions
  const lifetimeStats = calculateLifetimeStats(userSessions ?? [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header - matches ProfilePage exactly */}
      <div className="border-b border-border bg-card px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile</p>
          <p className="text-lg font-bold text-foreground">@{profile.username || profile.full_name || 'angler'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-foreground hover:bg-muted"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Profile hero & gamification - matches ProfilePage exactly */}
      <div className="border-b border-border bg-card px-5 py-4">
        <ProfileHero profile={profile} level={level} xp={xp} />

        {/* Stats grid */}
        <div className="mt-4">
          <ProfileStatsGrid
            postCount={postCount}
            followerCount={followCounts?.follower_count ?? 0}
            followingCount={followCounts?.following_count ?? 0}
            fourthStat={{ label: 'Sessions', value: lifetimeStats.sessionCount }}
            onFollowersClick={() => setFollowersModalTab('followers')}
            onFollowingClick={() => setFollowersModalTab('following')}
          />
        </div>

        {/* Badges summary */}
        <div className="mt-4">
          <BadgesSummaryCard
            completedChallenges={completedChallenges}
            onClick={() => setShowBadgesModal(true)}
          />
        </div>

        {/* Lifetime Stats */}
        <div className="mt-4">
          <LifetimeStatsCard
            sessionCount={lifetimeStats.sessionCount}
            catchesCount={lifetimeStats.catchesCount}
            totalWeightKg={lifetimeStats.totalWeightKg}
            personalBestLabel={lifetimeStats.personalBestLabel}
            topSpeciesLabel={lifetimeStats.topSpeciesLabel}
            onSessionsClick={() => {
              setActiveTab('sessions')
              document.getElementById('profile-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            onCatchesClick={() => {
              setActiveTab('catches')
              document.getElementById('profile-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />
        </div>

        {/* Primary actions - Follow/Message for other users */}
        {!isOwnProfile && (
          <div className="mt-4 flex gap-2">
            <FollowButton userId={profileId} isFollowing={isFollowing ?? false} className="flex-1" />
            <button
              type="button"
              onClick={() => {
                if (!profileId) return
                startConversation(profileId, {
                  onSuccess: (conversationId) => {
                    navigate(`/messages/${conversationId}`)
                  },
                  onError: (error) => {
                    console.error('Failed to start conversation:', error)
                    toast.error('Failed to start conversation')
                  },
                })
              }}
              disabled={isStartingConversation}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              <MessageCircle size={18} />
              {isStartingConversation ? 'Starting...' : 'Message'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs - matches ProfilePage exactly */}
      <div id="profile-tabs" className="sticky top-0 z-10 mt-2 border-b border-border bg-card">
        <div className="flex text-xs font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`flex-1 px-4 py-3 text-center ${
              activeTab === 'posts' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
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
              activeTab === 'sessions' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
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
              activeTab === 'catches' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
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
              activeTab === 'achievements' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Trophy size={14} />
              <span>Achievements</span>
            </span>
          </button>
        </div>
      </div>

      <div className="px-3 pb-6 pt-4">
        {/* Posts tab */}
        {activeTab === 'posts' && (
          <>
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !posts || (posts as any[]).length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">No posts yet</p>
                <p className="text-xs text-muted-foreground">This angler hasn't shared any posts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(posts as any[]).map((post) => (
                  <FeedPostCard key={post.id} post={post as any} showVisibility />
                ))}
              </div>
            )}
          </>
        )}

        {/* Sessions tab */}
        {activeTab === 'sessions' && (
          <>
            {sessionsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !userSessions || userSessions.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">No public sessions</p>
                <p className="text-xs text-muted-foreground">This angler hasn't shared any sessions publicly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start gap-3">
                      {session.cover_photo_url && (
                        <img
                          src={session.cover_photo_url}
                          alt={session.title || session.location_name || 'Session'}
                          className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 font-medium text-muted-foreground"
                          >
                            {typeof session.water_type === 'string' &&
                            (session.water_type.toLowerCase().includes('salt') ||
                              session.water_type.toLowerCase().includes('sea') ||
                              session.water_type.toLowerCase().includes('coastal'))
                              ? '🌊 Saltwater'
                              : '🏞️ Freshwater'}
                          </span>
                          <span>
                            {new Date(session.started_at).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {session.title || session.location_name || 'Fishing session'}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          📍 {session.location_name || 'Unknown location'}
                          {session.catches && session.catches.length > 0 && (
                            <span className="ml-2">🎣 {session.catches.length} catches</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Catches tab */}
        {activeTab === 'catches' && (
          <>
            {catchesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !catches || catches.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">No public catches</p>
                <p className="text-xs text-muted-foreground">This angler hasn't shared any catches publicly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {catches.map((c) => (
                  <CatchCard key={c.id} item={c} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Achievements tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-3">
            {completedChallenges.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">No achievements yet</p>
                <p className="text-xs text-muted-foreground">This angler hasn't completed any challenges yet.</p>
              </div>
            ) : (
              completedChallenges.map((uc) => (
                <button
                  key={uc.id}
                  type="button"
                  onClick={() => navigate(`/challenges/${uc.challenge?.slug}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-900/20 p-3 text-left text-sm shadow-sm transition-colors hover:border-emerald-400"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-2xl text-white">
                    {uc.challenge?.icon || '🎣'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {uc.challenge?.title || 'Challenge'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {uc.challenge?.description || ''}
                    </p>
                    {uc.completed_at && (
                      <p className="mt-0.5 text-[11px] font-semibold text-emerald-400">
                        ✓ Completed {new Date(uc.completed_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {followersModalTab && profileId && (
        <FollowersModal
          userId={profileId}
          initialTab={followersModalTab}
          onClose={() => setFollowersModalTab(null)}
        />
      )}

      {showBadgesModal && (
        <BadgesModal
          completedChallenges={completedChallenges}
          onClose={() => setShowBadgesModal(false)}
          isOwnProfile={isOwnProfile}
        />
      )}
    </div>
  )
}
