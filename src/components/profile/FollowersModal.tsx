import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2, MoreHorizontal, UserMinus, Ban } from 'lucide-react'
import { useFollowers, useFollowing, useUnfollowUser } from '../../hooks/useFollows'
import { useBlockUser } from '../../hooks/useBlocks'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'react-hot-toast'

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
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab)
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)

  const { data: followersData, isLoading: loadingFollowers } = useFollowers(userId)
  const { data: followingData, isLoading: loadingFollowing } = useFollowing(userId)
  const { mutateAsync: unfollowUser, isPending: isUnfollowing } = useUnfollowUser()
  const { mutateAsync: blockUser, isPending: isBlocking } = useBlockUser()

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
      <div className="relative mb-20 w-full max-w-md rounded-t-2xl bg-white sm:mb-0 sm:rounded-2xl">
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
            <div className="space-y-2">
              {users.map((user) => {
                const isOwnProfile = currentUser?.id === userId
                const showUnfollowActions = isOwnProfile && activeTab === 'following'
                const showBlockAction = isOwnProfile && user.id !== currentUser?.id

                return (
                  <div
                    key={user.id}
                    className="relative flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50"
                  >
                    <button
                      onClick={() => handleUserClick(user.id)}
                      className="flex flex-1 items-center gap-3 text-left"
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
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">
                          {user.full_name || user.username}
                        </p>
                        <p className="truncate text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </button>

                    {/* Actions Menu */}
                    {showBlockAction && (
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenFor(menuOpenFor === user.id ? null : user.id)}
                          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {menuOpenFor === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMenuOpenFor(null)}
                            />
                            <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                              {showUnfollowActions && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await unfollowUser(user.id)
                                      toast.success(`Unfollowed @${user.username}`)
                                      setMenuOpenFor(null)
                                    } catch {
                                      toast.error('Failed to unfollow')
                                    }
                                  }}
                                  disabled={isUnfollowing}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  <UserMinus size={14} />
                                  <span>Unfollow</span>
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!confirm(`Block @${user.username}? They won't be able to see your posts or follow you.`)) return
                                  try {
                                    await blockUser(user.id)
                                    toast.success(`Blocked @${user.username}`)
                                    setMenuOpenFor(null)
                                  } catch {
                                    toast.error('Failed to block user')
                                  }
                                }}
                                disabled={isBlocking}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Ban size={14} />
                                <span>Block</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
