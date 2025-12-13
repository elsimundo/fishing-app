import { useState } from 'react'
import { X, Search, Loader2, Check, UserPlus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useFollowing } from '../../hooks/useFollows'
import { useSavedMarks } from '../../hooks/useSavedMarks'
import type { SavedMark, Profile } from '../../types'

interface ShareMarkModalProps {
  mark: SavedMark
  onClose: () => void
}

export function ShareMarkModal({ mark, onClose }: ShareMarkModalProps) {
  const { user } = useAuth()
  const { shareMark } = useSavedMarks()
  const { data: followingData, isLoading } = useFollowing(user?.id || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set())

  // Extract profiles from following data
  const following = (followingData || []).map((f: unknown) => {
    const item = f as { following_id: string; profiles: Profile | Profile[] }
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
    return profile
  }).filter(Boolean) as Profile[]

  // Filter by search query
  const filteredFollowing = following.filter((profile) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      profile.username?.toLowerCase().includes(query) ||
      profile.full_name?.toLowerCase().includes(query)
    )
  })

  const handleShare = async (userId: string) => {
    if (sharedWith.has(userId)) return

    try {
      await shareMark.mutateAsync({
        mark_id: mark.id,
        shared_with: userId,
        can_edit: false,
      })
      setSharedWith((prev) => new Set([...prev, userId]))
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Share Mark</h2>
            <p className="text-xs text-muted-foreground">Share "{mark.name}" with friends</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Friends list */}
        <div className="max-h-80 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : following.length === 0 ? (
            <div className="py-8 text-center">
              <UserPlus size={32} className="mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No friends yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Follow other anglers to share marks with them
              </p>
            </div>
          ) : filteredFollowing.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No friends match "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFollowing.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-lg bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username || 'User'}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                        {(profile.username || profile.full_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {profile.full_name || profile.username}
                      </p>
                      {profile.username && profile.full_name && (
                        <p className="text-xs text-muted-foreground">@{profile.username}</p>
                      )}
                    </div>
                  </div>

                  {sharedWith.has(profile.id) ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-900/30 border border-emerald-500/40 px-3 py-1 text-xs font-medium text-emerald-400">
                      <Check size={12} />
                      Shared
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleShare(profile.id)}
                      disabled={shareMark.isPending}
                      className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-900 disabled:bg-navy-400"
                    >
                      {shareMark.isPending ? 'Sharing...' : 'Share'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-background py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
