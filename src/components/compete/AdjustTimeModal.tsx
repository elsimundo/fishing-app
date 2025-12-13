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
      <div className="bg-card border border-border rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock size={24} className="text-primary" />
            <h2 className="text-lg font-bold text-foreground">Adjust End Time</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Current End Time
            </label>
            <div className="px-4 py-3 bg-background rounded-xl text-muted-foreground">
              {format(new Date(currentEndsAt), 'PPpp')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              New End Time <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={newEndsAt}
              onChange={(e) => setNewEndsAt(e.target.value)}
              min={currentEndsAtFormatted}
              className="w-full px-4 py-3 border-2 border-border bg-background text-foreground rounded-xl focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Weather conditions improved, extending competition..."
              className="w-full px-4 py-3 border-2 border-border bg-background text-foreground rounded-xl resize-none focus:outline-none focus:border-primary"
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
        <div className="flex gap-3 p-5 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-border bg-background text-muted-foreground rounded-xl font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!newEndsAt || adjustTime.isPending}
            className="flex-1 px-4 py-3 bg-navy-800 text-white rounded-xl font-semibold hover:bg-navy-900 disabled:bg-navy-400 disabled:cursor-not-allowed"
          >
            {adjustTime.isPending ? 'Adjusting...' : 'Adjust Time'}
          </button>
        </div>
      </div>
    </div>
  )
}
