import { useState } from 'react'
import { Clock, Check, X } from 'lucide-react'
import { useCompetitionPendingCatches } from '../../hooks/useCompetitionPendingCatches'
import { useApproveCatch, useRejectCatch } from '../../hooks/useCatchValidation'
import { formatDistanceToNow } from 'date-fns'

interface PendingCatchesPanelProps {
  competitionId: string
}

export function PendingCatchesPanel({ competitionId }: PendingCatchesPanelProps) {
  const { data: pendingCatches, isLoading } = useCompetitionPendingCatches(competitionId)
  const approveCatch = useApproveCatch()
  const rejectCatch = useRejectCatch()

  const [rejectingCatchId, setRejectingCatchId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading pending catches...</div>
  }

  if (!pendingCatches || pendingCatches.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock size={48} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 font-semibold">No pending catches</p>
        <p className="text-sm text-gray-500">All catches have been validated</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Pending Validation ({pendingCatches.length})
        </h3>
        <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
          Organizer Review
        </div>
      </div>

      {pendingCatches.map((catch_) => (
        <div
          key={catch_.id}
          className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4"
        >
          <div className="flex items-start gap-3 mb-3">
            {/* Catch Photo */}
            {catch_.photo_url ? (
              <img
                src={catch_.photo_url}
                alt={catch_.species}
                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center text-3xl flex-shrink-0">
                🐟
              </div>
            )}

            {/* Catch Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">
                {catch_.species} - {catch_.weight_kg}kg
                {catch_.length_cm && (
                  <span className="text-gray-600 text-sm ml-2">({catch_.length_cm}cm)</span>
                )}
              </h4>
              <p className="text-sm text-gray-600 mt-1">by @{catch_.user.username}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(catch_.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Validation Actions */}
          {rejectingCatchId === catch_.id ? (
            <div className="space-y-2">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (required)..."
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg resize-none focus:outline-none focus:border-navy-800"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    rejectCatch.mutate(
                      { catchId: catch_.id, reason: rejectionReason },
                      {
                        onSuccess: () => {
                          setRejectingCatchId(null)
                          setRejectionReason('')
                        },
                      }
                    )
                  }}
                  disabled={!rejectionReason.trim() || rejectCatch.isPending}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => {
                    setRejectingCatchId(null)
                    setRejectionReason('')
                  }}
                  className="px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => approveCatch.mutate(catch_.id)}
                disabled={approveCatch.isPending}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} />
                <span>Approve</span>
              </button>
              <button
                onClick={() => setRejectingCatchId(catch_.id)}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                <span>Reject</span>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
