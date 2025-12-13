import { xpProgress } from '../../hooks/useGamification'

interface ProfileHeroProps {
  profile: {
    avatar_url?: string | null
    full_name?: string | null
    username?: string | null
    bio?: string | null
  }
  level: number
  xp: number
}

export function ProfileHero({ profile, level, xp }: ProfileHeroProps) {
  const xpProg = xpProgress(xp, level)

  const rankLabel =
    level < 5
      ? 'Beginner Angler'
      : level < 10
        ? 'Developing Angler'
        : level < 20
          ? 'Intermediate Angler'
          : level < 30
            ? 'Experienced Angler'
            : 'Seasoned Angler'

  return (
    <div className="flex items-start gap-4">
      {/* Avatar + level badge */}
      <div className="relative">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || profile.username || 'Avatar'}
            className="h-16 w-16 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#1BA9A0] to-[#14B8A6] text-xl font-bold text-white shadow-sm">
            {(profile.full_name || profile.username || 'U').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-xs font-bold text-white shadow">
          {level}
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold text-white">
            {profile.full_name || 'Angler'}
          </p>
          <p className="text-xs text-gray-400">@{profile.username || 'angler'}</p>
          {profile.bio && (
            <p className="mt-1 text-xs text-gray-400 line-clamp-2">{profile.bio}</p>
          )}
        </div>

        {/* Rank pill */}
        <div className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 px-2.5 py-1 text-[11px] font-medium text-amber-400">
          <span>⚡</span>
          <span>{rankLabel}</span>
        </div>

        {/* XP bar inline */}
        <div className="mt-1">
          <div className="mb-1 flex justify-between text-[11px] text-gray-500">
            <span>Level {level}</span>
            <span>
              {xpProg.current}/{xpProg.needed} XP to level {level + 1}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#334155]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1BA9A0] to-[#14B8A6]"
              style={{ width: `${xpProg.percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
