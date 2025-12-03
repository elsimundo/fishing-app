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
  const [role, setRole] = useState<ParticipantRole>('contributor')
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white md:max-w-lg md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Invite to session</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Role selection */}
        <div className="border-b border-gray-200 px-5 py-3 text-sm text-gray-700">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Role</p>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setRole('contributor')}
              className={`flex-1 rounded-xl border px-3 py-2 font-medium ${role === 'contributor' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'}`}
            >
              Contributor
              <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
                Can log catches in this session
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRole('viewer')}
              className={`flex-1 rounded-xl border px-3 py-2 font-medium ${role === 'viewer' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'}`}
            >
              Viewer
              <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
                Can view session only
              </span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="px-5 py-4">
          <label className="mb-2 block text-sm font-medium text-gray-900">Search anglers</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-navy-800"
          />
          <p className="mt-1 text-xs text-gray-500">
            We&apos;ll show anglers who match your search. Tap one to send an invite.
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-4">
          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">Start typing to find anglers to invite.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800"
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
                      <p className="font-medium text-gray-900">{user.full_name || user.username || 'Angler'}</p>
                      {user.username ? (
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleInvite(user.id)}
                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-500"
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
        <div className="flex gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
