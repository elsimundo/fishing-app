import { useState } from 'react'
import { X, Clock } from 'lucide-react'
import { useAdjustCompetitionTime } from '../../hooks/useAdjustCompetitionTime'
import { format } from 'date-fns'

interface AdjustTimeModalProps {
  competitionId: string
  currentEndsAt: string
  onClose: () => void
}

export function AdjustTimeModal({
  competitionId,
  currentEndsAt,
  onClose,
}: AdjustTimeModalProps) {
  const adjustTime = useAdjustCompetitionTime()

  // Format for datetime-local input
  const currentEndsAtFormatted = format(new Date(currentEndsAt), "yyyy-MM-dd'T'HH:mm")
  const [newEndsAt, setNewEndsAt] = useState(currentEndsAtFormatted)
  const [reason, setReason] = useState('')

  const handleSubmit = () => {
    if (!newEndsAt) return

    adjustTime.mutate(
      {
        competitionId,
        newEndsAt: new Date(newEndsAt).toISOString(),
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
      <div className="bg-[#243B4A] border border-[#334155] rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#334155]">
          <div className="flex items-center gap-2">
            <Clock size={24} className="text-[#1BA9A0]" />
            <h2 className="text-lg font-bold text-white">Adjust End Time</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#334155] rounded-full transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Current End Time
            </label>
            <div className="px-4 py-3 bg-[#1A2D3D] rounded-xl text-gray-400">
              {format(new Date(currentEndsAt), 'PPpp')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              New End Time <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={newEndsAt}
              onChange={(e) => setNewEndsAt(e.target.value)}
              min={currentEndsAtFormatted}
              className="w-full px-4 py-3 border-2 border-[#334155] bg-[#1A2D3D] text-white rounded-xl focus:outline-none focus:border-[#1BA9A0]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Weather conditions improved, extending competition..."
              className="w-full px-4 py-3 border-2 border-[#334155] bg-[#1A2D3D] text-white rounded-xl resize-none focus:outline-none focus:border-[#1BA9A0]"
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="p-3 bg-blue-900/30 border border-blue-500/40 rounded-lg">
            <p className="text-xs text-blue-300">
              <strong>Note:</strong> Competitors will be notified of the time change. Catches can
              be logged until the new end time.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t border-[#334155]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-[#334155] bg-[#1A2D3D] text-gray-300 rounded-xl font-semibold hover:bg-[#334155]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!newEndsAt || adjustTime.isPending}
            className="flex-1 px-4 py-3 bg-[#1BA9A0] text-white rounded-xl font-semibold hover:bg-[#14B8A6] disabled:bg-[#334155] disabled:cursor-not-allowed"
          >
            {adjustTime.isPending ? 'Adjusting...' : 'Adjust Time'}
          </button>
        </div>
      </div>
    </div>
  )
}
