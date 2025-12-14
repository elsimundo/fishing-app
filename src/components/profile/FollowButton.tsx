import { Loader2 } from 'lucide-react'
import { useFollowUser, useUnfollowUser } from '../../hooks/useFollows'

interface FollowButtonProps {
  userId: string
  isFollowing: boolean
  className?: string
}

export function FollowButton({ userId, isFollowing, className = '' }: FollowButtonProps) {
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
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isFollowing
          ? 'bg-muted text-foreground hover:bg-muted/80 border border-border'
          : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/60'
      } ${className}`}
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
