import type { SessionParticipant, ParticipantRole } from '../../types'

interface ParticipantsListProps {
  participants: SessionParticipant[]
  currentUserId: string | null
  myRole: ParticipantRole | null
  onChangeRole?: (participant: SessionParticipant, role: ParticipantRole) => void
  onRemove?: (participant: SessionParticipant) => void
}

function roleLabel(role: ParticipantRole): string {
  switch (role) {
    case 'owner':
      return 'Owner'
    case 'contributor':
      return 'Contributor'
    case 'viewer':
      return 'Viewer'
    default:
      return role
  }
}

export function ParticipantsList({
  participants,
  currentUserId,
  myRole,
  onChangeRole,
  onRemove,
}: ParticipantsListProps) {
  if (!participants || participants.length === 0) {
    if (myRole === 'owner') {
      return (
        <p className="text-[11px] text-slate-500">
          You&apos;re the only angler in this session so far. Use the Invite button to add contributors or
          viewers.
        </p>
      )
    }

    return <p className="text-[11px] text-slate-500">No other participants have joined this session yet.</p>
  }

  return (
    <ul className="space-y-1">
      {participants.map((p) => {
        const isCurrentUser = currentUserId != null && p.user_id === currentUserId
        const canManage = myRole === 'owner' && !isCurrentUser
        const effectiveStatus =
          p.status === 'pending' && p.role === 'contributor' ? 'active' : p.status
        const displayName =
          p.user?.full_name || p.user?.username || (isCurrentUser ? 'You' : 'Angler')

        return (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-600"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {p.user?.avatar_url ? (
                <img
                  src={p.user.avatar_url}
                  alt={displayName}
                  className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-[10px] font-bold text-white">
                  {displayName?.[0]?.toUpperCase() ?? 'A'}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-800">
                  {displayName}
                  {isCurrentUser ? ' (you)' : ''}
                </p>
                <p className="text-[10px] text-slate-500">
                  {roleLabel(p.role)}
                  {p.status === 'pending' && p.role !== 'contributor' ? ' · Invited' : null}
                </p>
              </div>
            </div>

            <div className="ml-2 flex items-center gap-1">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600">
                {effectiveStatus === 'active'
                  ? 'Active'
                  : effectiveStatus === 'pending'
                    ? 'Pending'
                    : effectiveStatus === 'left'
                      ? 'Left'
                      : 'Removed'}
              </span>

              {canManage && onChangeRole ? (
                <select
                  value={p.role}
                  onChange={(e) => onChangeRole(p, e.target.value as ParticipantRole)}
                  className="rounded-md border border-slate-300 bg-white px-1 py-0.5 text-[9px] text-slate-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="contributor">Contributor</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : null}

              {canManage && onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(p)}
                  className="rounded-md border border-slate-300 px-2 py-0.5 text-[9px] text-slate-600 hover:bg-slate-100"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
