interface ProfileStatsProps {
  postCount: number
  followerCount: number
  followingCount: number
  onFollowersClick?: () => void
  onFollowingClick?: () => void
}

export function ProfileStats({
  postCount,
  followerCount,
  followingCount,
  onFollowersClick,
  onFollowingClick,
}: ProfileStatsProps) {
  return (
    <div className="flex justify-around text-center">
      <div className="flex flex-col">
        <span className="text-lg font-bold text-foreground">{postCount}</span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Posts</span>
      </div>

      <button
        type="button"
        onClick={onFollowersClick}
        className="flex flex-col hover:opacity-70 transition-opacity"
      >
        <span className="text-lg font-bold text-foreground">{followerCount}</span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Followers</span>
      </button>

      <button
        type="button"
        onClick={onFollowingClick}
        className="flex flex-col hover:opacity-70 transition-opacity"
      >
        <span className="text-lg font-bold text-foreground">{followingCount}</span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Following</span>
      </button>
    </div>
  )
}
