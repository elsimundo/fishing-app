import { Loader2 } from 'lucide-react'
import { useFollowUser, useUnfollowUser } from '../../hooks/useFollows'

interface FollowButtonProps {
  userId: string
  isFollowing: boolean
}

export function FollowButton({ userId, isFollowing }: FollowButtonProps) {
  const followUser = useFollowUser()
  const unfollowUser = useUnfollowUser()

  const isPending = followUser.isPending || unfollowUser.isPending

  const handleClick = () => {
    if (isPending) return

    if (isFollowing) {
      unfollowUser.mutate(userId)
    } else {
      followUser.mutate(userId)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isFollowing ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' : 'bg-navy-800 text-white hover:bg-navy-900'
      }`}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {isFollowing ? 'Unfollowing…' : 'Following…'}
        </>
      ) : (
        <>{isFollowing ? 'Following' : 'Follow'}</>
      )}
    </button>
  )
}
