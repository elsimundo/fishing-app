import type { Profile } from '../../types'

interface ProfileHeaderProps {
  profile: Profile
  isOwnProfile: boolean
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="bg-white">
      <div className="relative">
        {profile.cover_photo_url ? (
          <img
            src={profile.cover_photo_url}
            alt="Cover"
            className="h-48 w-full object-cover md:h-64"
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-r from-cyan-600 to-emerald-500 md:h-64" />
        )}
      </div>

      <div className="px-5 pb-4">
        <div className="-mt-12 mb-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username || 'User'}
              className="h-24 w-24 rounded-full border-4 border-white object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-cyan-600 to-emerald-500 text-3xl font-bold text-white">
              {profile.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
          )}
        </div>

        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-900">
            {profile.full_name || profile.username || 'Unnamed User'}
          </h1>
          <p className="text-sm text-gray-600">@{profile.username || 'user'}</p>
        </div>

        {profile.bio ? (
          <p className="mb-3 text-[15px] leading-relaxed text-gray-700">{profile.bio}</p>
        ) : null}

        {profile.location ? (
          <p className="flex items-center gap-1 text-sm text-gray-600">📍 {profile.location}</p>
        ) : null}
      </div>
    </div>
  )
}
