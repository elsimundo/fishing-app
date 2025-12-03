import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsFollowing, useFollowCounts } from '../../hooks/useFollows'
import { FollowButton } from '../profile/FollowButton'

interface UserCardProps {
  user: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
    bio?: string | null
    location?: string | null
  }
}

export function UserCard({ user }: UserCardProps) {
  const navigate = useNavigate()
  const { data: isFollowing } = useIsFollowing(user.id)
  const { data: followCounts } = useFollowCounts(user.id)

  const handleCardClick = () => {
    navigate(`/profile/${user.id}`)
  }

  const handleFollowClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation()
  }

  return (
    <div
      onClick={handleCardClick}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-navy-800"
    >
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.username || 'User'}
          className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-lg font-bold text-white">
          {user.username?.[0]?.toUpperCase() || 'U'}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-gray-900">
          {user.full_name || user.username || 'Unnamed User'}
        </div>
        <div className="mb-1 text-xs text-gray-600">@{user.username || 'user'}</div>
        {user.bio && (
          <p className="mb-2 line-clamp-2 text-sm text-gray-700">{user.bio}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          {user.location && (
            <span className="flex items-center gap-1">📍 {user.location}</span>
          )}
          <span>{followCounts?.follower_count ?? 0} followers</span>
        </div>
      </div>

      <div onClick={handleFollowClick} className="flex-shrink-0">
        <FollowButton userId={user.id} isFollowing={isFollowing ?? false} />
      </div>
    </div>
  )
}
