interface ProfileStatsGridProps {
  postCount: number
  followerCount: number
  followingCount: number
  fourthStat: { label: string; value: number }
  onFollowersClick?: () => void
  onFollowingClick?: () => void
  onFourthClick?: () => void
}

export function ProfileStatsGrid({
  postCount,
  followerCount,
  followingCount,
  fourthStat,
  onFollowersClick,
  onFollowingClick,
  onFourthClick,
}: ProfileStatsGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="rounded-xl bg-[#1A2D3D] px-2.5 py-2 text-center">
        <p className="text-base font-bold text-white">{postCount}</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Posts
        </p>
      </div>
      <button
        type="button"
        onClick={onFollowersClick}
        className="rounded-xl bg-[#1A2D3D] px-2.5 py-2 text-center hover:bg-[#0D4B4E]"
      >
        <p className="text-base font-bold text-white">{followerCount}</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Followers
        </p>
      </button>
      <button
        type="button"
        onClick={onFollowingClick}
        className="rounded-xl bg-[#1A2D3D] px-2.5 py-2 text-center hover:bg-[#0D4B4E]"
      >
        <p className="text-base font-bold text-white">{followingCount}</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Following
        </p>
      </button>
      {onFourthClick ? (
        <button
          type="button"
          onClick={onFourthClick}
          className="rounded-xl bg-[#1A2D3D] px-2.5 py-2 text-center hover:bg-[#0D4B4E]"
        >
          <p className="text-base font-bold text-white">{fourthStat.value}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
            {fourthStat.label}
          </p>
        </button>
      ) : (
        <div className="rounded-xl bg-[#1A2D3D] px-2.5 py-2 text-center">
          <p className="text-base font-bold text-white">{fourthStat.value}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
            {fourthStat.label}
          </p>
        </div>
      )}
    </div>
  )
}
