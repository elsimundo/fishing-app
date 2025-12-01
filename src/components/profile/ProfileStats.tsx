interface ProfileStatsProps {
  postCount: number
  followerCount: number
  followingCount: number
}

export function ProfileStats({ postCount, followerCount, followingCount }: ProfileStatsProps) {
  return (
    <div className="flex justify-around text-center">
      <button type="button" className="flex flex-col">
        <span className="text-lg font-bold text-gray-900">{postCount}</span>
        <span className="text-xs uppercase tracking-wide text-gray-600">Posts</span>
      </button>

      <button type="button" className="flex flex-col">
        <span className="text-lg font-bold text-gray-900">{followerCount}</span>
        <span className="text-xs uppercase tracking-wide text-gray-600">Followers</span>
      </button>

      <button type="button" className="flex flex-col">
        <span className="text-lg font-bold text-gray-900">{followingCount}</span>
        <span className="text-xs uppercase tracking-wide text-gray-600">Following</span>
      </button>
    </div>
  )
}
