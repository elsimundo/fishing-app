import { X } from 'lucide-react'
import type { UserChallenge } from '../../hooks/useGamification'

interface BadgesModalProps {
  completedChallenges: UserChallenge[]
  onClose: () => void
  isOwnProfile?: boolean
}

export function BadgesModal({ completedChallenges, onClose, isOwnProfile = false }: BadgesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🏆 Badges</h2>
            <p className="text-xs text-gray-500">
              {completedChallenges.length} earned
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {completedChallenges.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                🎣
              </div>
              <p className="font-medium text-gray-900">No badges yet</p>
              <p className="mt-1 text-sm text-gray-500">
                {isOwnProfile
                  ? 'Complete challenges by logging catches and sessions to earn badges.'
                  : 'This angler hasn\'t earned any badges yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {completedChallenges.map((uc) => (
                <div
                  key={uc.id}
                  className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-3"
                >
                  <div className="mb-2 text-3xl">{uc.challenge?.icon || '🎣'}</div>
                  <p className="text-sm font-semibold text-gray-900">
                    {uc.challenge?.title || 'Challenge'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-600 line-clamp-2">
                    {uc.challenge?.description || ''}
                  </p>
                  {uc.completed_at && (
                    <p className="mt-2 text-[10px] font-medium text-emerald-700">
                      ✓ Earned {new Date(uc.completed_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
