import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUserSearch } from '../hooks/useUserSearch'
import { useIsFollowing } from '../hooks/useFollows'
import { FollowButton } from '../components/profile/FollowButton'

export default function SearchUsersPage() {
  const [query, setQuery] = useState('')
  const { data: results, isLoading } = useUserSearch(query)
  const navigate = useNavigate()

  const hasQuery = query.trim().length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
          >
            Back
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
            <Search size={16} className="text-gray-500" />
            <input
              className="w-full bg-transparent text-sm text-gray-900 outline-none"
              placeholder="Search anglers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        {!hasQuery && (
          <p className="text-sm text-gray-500">
            Start typing to search for anglers by name or @username.
          </p>
        )}

        {hasQuery && isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-navy-800" />
          </div>
        )}

        {hasQuery && !isLoading && (!results || results.length === 0) && (
          <p className="py-8 text-sm text-gray-500">No anglers found.</p>
        )}

        {hasQuery && results && results.length > 0 && (
          <div className="space-y-3">
            {results.map((profile) => (
              <SearchResultRow key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SearchResultRow({ profile }: { profile: any }) {
  const { data: isFollowing = false } = useIsFollowing(profile.id)
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
      <button
        type="button"
        onClick={() => navigate(`/profile/${profile.id}`)}
        className="flex flex-1 items-center gap-3 text-left"
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username || 'User'}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-sm font-bold text-white">
            {profile.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {profile.full_name || profile.username || 'Unnamed User'}
          </p>
          <p className="truncate text-xs text-gray-500">@{profile.username || 'user'}</p>
          {profile.location && (
            <p className="truncate text-[11px] text-gray-400">📍 {profile.location}</p>
          )}
        </div>
      </button>

      <div className="ml-3 w-28">
        <FollowButton userId={profile.id} isFollowing={isFollowing} />
      </div>
    </div>
  )
}
