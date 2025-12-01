import { formatDistanceToNow } from 'date-fns'

interface PostHeaderProps {
  user: {
    id: string
    username: string
    full_name: string
    avatar_url?: string | null
  }
  createdAt: string
  onUserClick: () => void
}

export function PostHeader({ user, createdAt, onUserClick }: PostHeaderProps) {
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true })

  return (
    <div className="mb-3 flex items-center gap-3">
      <button type="button" onClick={onUserClick} className="flex-shrink-0">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.username}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-sm font-semibold text-white">
            {user.username?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onUserClick}
          className="text-[15px] font-semibold text-gray-900 hover:underline"
        >
          {user.username}
        </button>
        <p className="text-[13px] text-gray-600">{timeAgo}</p>
      </div>
    </div>
  )
}
