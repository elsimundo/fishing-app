import { useState } from 'react'
import { Loader2, UserPlus, X } from 'lucide-react'
import type { ParticipantRole } from '../../types'
import { useUserSearch } from '../../hooks/useUserSearch'
import { useInviteToSession } from '../../hooks/useSessionParticipants'

interface InviteToSessionModalProps {
  sessionId: string
  onClose: () => void
}

export function InviteToSessionModal({ sessionId, onClose }: InviteToSessionModalProps) {
  const [query, setQuery] = useState('')
  const [role] = useState<ParticipantRole>('contributor') // Always contributor for invites
  const { data: results = [], isLoading } = useUserSearch(query)
  const { mutate, isPending } = useInviteToSession()
  const [error, setError] = useState<string | null>(null)

  const handleInvite = (userId: string) => {
    if (isPending) return
    setError(null)

    mutate(
      { session_id: sessionId, user_id: userId, role },
      {
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'Failed to send invite.'
          setError(message)
        },
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card border border-border md:max-w-lg md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">Invite to session</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Info banner */}
        <div className="border-b border-border bg-emerald-900/20 px-5 py-3">
          <p className="text-xs text-emerald-400">
            <span className="font-semibold">Invites create contributors.</span> Invited users can log catches and add posts to this session.
          </p>
        </div>

        {/* Search input */}
        <div className="px-5 py-4">
          <label className="mb-2 block text-sm font-medium text-foreground">Search anglers</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name"
            className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            We&apos;ll show anglers who match your search. Tap one to send an invite.
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-4">
          {error ? <p className="text-xs text-red-400">{error}</p> : null}

          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Start typing to find anglers to invite.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground"
                >
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username || 'User'}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-xs font-bold text-white">
                        {user.username?.[0]?.toUpperCase() ?? 'A'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{user.full_name || user.username || 'Angler'}</p>
                      {user.username ? (
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleInvite(user.id)}
                    className="flex items-center gap-1 rounded-xl bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-navy-400"
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <UserPlus className="h-3 w-3" />
                    )}
                    Invite
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
