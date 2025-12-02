import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFollowCounts, useIsFollowing } from '../hooks/useFollows'
import { useUserPosts } from '../hooks/usePosts'
import { FeedPostCard } from '../components/feed/FeedPostCard'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfileStats } from '../components/profile/ProfileStats'
import { PostsGrid } from '../components/profile/PostsGrid'
import { FollowButton } from '../components/profile/FollowButton'
import type { Profile } from '../types'

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    },
    enabled: Boolean(userId),
  })

  const { data: followCounts } = useFollowCounts(userId ?? '')
  const { data: posts, isLoading: postsLoading } = useUserPosts(userId ?? '')
  const { data: isFollowing } = useIsFollowing(userId)

  const isOwnProfile = currentUser?.id === userId

  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-800" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-5 text-center">
        <p className="mb-2 text-lg font-semibold text-gray-900">User not found</p>
        <p className="text-sm text-gray-600">This profile does not exist or has been deleted.</p>
      </div>
    )
  }

  const postCount = (posts as unknown[] | undefined)?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      <div className="border-b border-gray-200 bg-white px-5 py-4">
        <ProfileStats
          postCount={postCount}
          followerCount={followCounts?.follower_count ?? 0}
          followingCount={followCounts?.following_count ?? 0}
        />
      </div>

      {!isOwnProfile ? (
        <div className="border-b border-gray-200 bg-white px-5 py-3">
          <FollowButton userId={userId ?? ''} isFollowing={isFollowing ?? false} />
        </div>
      ) : null}

      <div className="p-5">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Posts</h2>
        {postsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-navy-800" />
          </div>
        ) : !posts || (posts as any[]).length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">No posts yet.</div>
        ) : (
          <div className="space-y-3">
            {(posts as any[]).map((post) => (
              <FeedPostCard key={post.id} post={post as any} showVisibility />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
