import type { Profile } from '../../types'

interface ProfileHeaderProps {
  profile: Profile
  isOwnProfile: boolean
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="bg-white px-5 pb-4 pt-6">
      <div className="mb-4 flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username || 'User'}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-2xl font-bold text-white">
            {profile.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
        )}

        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {profile.full_name || profile.username || 'Unnamed User'}
          </h1>
          <p className="text-sm text-gray-600">@{profile.username || 'user'}</p>
        </div>
      </div>

      {profile.bio ? (
        <p className="mb-3 text-[15px] leading-relaxed text-gray-700">{profile.bio}</p>
      ) : null}

      {profile.location ? (
        <p className="flex items-center gap-1 text-sm text-gray-600">📍 {profile.location}</p>
      ) : null}
    </div>
  )
}
