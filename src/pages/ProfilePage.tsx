import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Settings, Share2, MessageCircle, Trash2, Fish, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useFollowCounts } from '../hooks/useFollows'
import { useOwnPosts, useTogglePostVisibility } from '../hooks/usePosts'
import { useUnreadCount } from '../hooks/useMessages'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfileStats } from '../components/profile/ProfileStats'
import { FeedPostCard } from '../components/feed/FeedPostCard'
import { EditProfileModal } from '../components/profile/EditProfileModal'
import { FollowersModal } from '../components/profile/FollowersModal'
import { DeleteAccountModal } from '../components/profile/DeleteAccountModal'
import { FishingPreferenceModal } from '../components/onboarding/FishingPreferenceModal'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreferenceModal, setShowPreferenceModal] = useState(false)
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following' | null>(null)
  const unreadCount = useUnreadCount()

  const userId = user?.id ?? ''
  const { data: followCounts } = useFollowCounts(userId)
  const { data: posts, isLoading: postsLoading } = useOwnPosts(userId)
  const { mutate: toggleVisibility } = useTogglePostVisibility()

  const preferenceLabels: Record<string, string> = {
    sea: 'Sea Fishing',
    freshwater: 'Freshwater Fishing',
    both: 'All Fishing',
  }

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
          onFollowersClick={() => setFollowersModalTab('followers')}
          onFollowingClick={() => setFollowersModalTab('following')}
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
          onClick={() => navigate('/messages')}
          className="relative rounded-lg bg-gray-100 p-2 transition-colors hover:bg-gray-200"
        >
          <MessageCircle size={20} className="text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className="rounded-lg bg-gray-100 p-2 transition-colors hover:bg-gray-200"
        >
          <Share2 size={20} className="text-gray-700" />
        </button>
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="rounded-lg bg-gray-100 p-2 transition-colors hover:bg-gray-200"
        >
          <Settings size={20} className="text-gray-700" />
        </button>
      </div>

      {/* Settings */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Settings</h3>
        </div>
        
        {/* Fishing Preference */}
        <button
          type="button"
          onClick={() => setShowPreferenceModal(true)}
          className="flex w-full items-center justify-between px-5 py-3 hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <Fish size={18} className="text-gray-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Fishing Preference</p>
              <p className="text-xs text-gray-500">
                {profile.fishing_preference 
                  ? preferenceLabels[profile.fishing_preference] 
                  : 'Not set'}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>

        {/* Delete Account */}
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="flex w-full items-center gap-3 px-5 py-3 text-red-600 hover:bg-red-50"
        >
          <Trash2 size={18} />
          <span className="text-sm font-medium">Delete Account</span>
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
            Nothing shared yet. Share a great session, catch, or photo from your logbook.
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
