import { useState } from 'react'
import { X, Trophy } from 'lucide-react'
import { useDeclareWinner } from '../../hooks/useCompetitionWinners'
import { useCompetitionLeaderboard } from '../../hooks/useCompetitionLeaderboard'

interface DeclareWinnerModalProps {
  competitionId: string
  onClose: () => void
}

export function DeclareWinnerModal({ competitionId, onClose }: DeclareWinnerModalProps) {
  const { data: leaderboard } = useCompetitionLeaderboard(competitionId)
  const declareWinner = useDeclareWinner()

  const [selectedUserId, setSelectedUserId] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [notes, setNotes] = useState('')

  const predefinedCategories = [
    'heaviest_fish',
    'most_catches',
    'most_species',
    'first_catch',
    'last_catch',
    'biggest_surprise',
  ]

  const handleSubmit = () => {
    const finalCategory = category === 'custom' ? customCategory.trim() : category
    if (!selectedUserId || !finalCategory) return

    declareWinner.mutate(
      {
        competitionId,
        winnerUserId: selectedUserId,
        category: finalCategory,
        notes: notes.trim() || undefined,
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
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Trophy size={24} className="text-yellow-500" />
            <h2 className="text-lg font-bold text-gray-900">Declare Winner</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Select Winner */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Winner <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-800"
            >
              <option value="">Choose competitor...</option>
              {leaderboard?.map((entry) => (
                <option key={entry.user_id} value={entry.user_id}>
                  @{entry.username} - Rank #{entry.rank}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Category <span className="text-red-600">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-800 mb-2"
            >
              <option value="">Choose category...</option>
              {predefinedCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
              <option value="custom">Custom Category...</option>
            </select>

            {category === 'custom' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category name..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-800"
                maxLength={50}
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this winner..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-navy-800"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">{notes.length}/200</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !selectedUserId ||
              (!category || (category === 'custom' && !customCategory.trim())) ||
              declareWinner.isPending
            }
            className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Trophy size={18} />
            <span>{declareWinner.isPending ? 'Declaring...' : 'Declare Winner'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
