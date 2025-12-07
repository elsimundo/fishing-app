import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2 } from 'lucide-react'
import { useFollowers, useFollowing } from '../../hooks/useFollows'

interface FollowersModalProps {
  userId: string
  initialTab: 'followers' | 'following'
  onClose: () => void
}

interface FollowUser {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
}

export function FollowersModal({ userId, initialTab, onClose }: FollowersModalProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab)

  const { data: followersData, isLoading: loadingFollowers } = useFollowers(userId)
  const { data: followingData, isLoading: loadingFollowing } = useFollowing(userId)

  // Extract profiles from the follow data
  const followers: FollowUser[] = (followersData || []).map((f: any) => f.profiles).filter(Boolean)
  const following: FollowUser[] = (followingData || []).map((f: any) => f.profiles).filter(Boolean)

  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing
  const users = activeTab === 'followers' ? followers : following

  const handleUserClick = (profileId: string) => {
    onClose()
    navigate(`/profile/${profileId}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-white sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-bold text-gray-900">
            {activeTab === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'followers'
                ? 'border-b-2 border-navy-800 text-navy-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'following'
                ? 'border-b-2 border-navy-800 text-navy-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Following ({following.length})
          </button>
        </div>

        {/* User List */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-navy-800" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {activeTab === 'followers'
                ? 'No followers yet'
                : 'Not following anyone yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-gray-50"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 font-bold text-white">
                      {user.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-gray-900">
                      {user.full_name || user.username}
                    </p>
                    <p className="truncate text-sm text-gray-500">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
