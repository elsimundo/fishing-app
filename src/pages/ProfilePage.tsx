import { useState } from 'react'
import { Loader2, Settings, Share2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useFollowCounts } from '../hooks/useFollows'
import { useOwnPosts, useTogglePostVisibility } from '../hooks/usePosts'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfileStats } from '../components/profile/ProfileStats'
import { FeedPostCard } from '../components/feed/FeedPostCard'
import { EditProfileModal } from '../components/profile/EditProfileModal'

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const [showEditModal, setShowEditModal] = useState(false)

  const userId = user?.id ?? ''
  const { data: followCounts } = useFollowCounts(userId)
  const { data: posts, isLoading: postsLoading } = useOwnPosts(userId)
  const { mutate: toggleVisibility } = useTogglePostVisibility()

  if (!user || profileLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-800" />
      </div>
    )
  }

  const postCount = (posts as unknown[] | undefined)?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileHeader profile={profile} isOwnProfile={true} />

      <div className="border-b border-gray-200 bg-white px-5 py-4">
        <ProfileStats
          postCount={postCount}
          followerCount={followCounts?.follower_count ?? 0}
          followingCount={followCounts?.following_count ?? 0}
        />
      </div>

      <div className="flex gap-3 border-b border-gray-200 bg-white px-5 py-3">
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-900 transition-colors hover:bg-gray-200"
        >
          Edit Profile
        </button>
        <button
          type="button"
          className="rounded-lg bg-gray-100 p-2 transition-colors hover:bg-gray-200"
        >
          <Share2 size={20} className="text-gray-700" />
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/settings'
          }}
          className="rounded-lg bg-gray-100 p-2 transition-colors hover:bg-gray-200"
        >
          <Settings size={20} className="text-gray-700" />
        </button>
      </div>

      <div className="p-5">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Posts</h2>
        {postsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-navy-800" />
          </div>
        ) : !posts || (posts as any[]).length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            Nothing shared yet. Share a great session, catch, or photo from your dashboard.
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

      {showEditModal ? (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            window.location.reload()
          }}
        />
      ) : null}
    </div>
  )
}
