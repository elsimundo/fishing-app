import { useState } from 'react'
import { X } from 'lucide-react'
import { useUpdateSession } from '../../hooks/useUpdateSession'
import { toast } from 'react-hot-toast'
import type { SessionWithCatches } from '../../types'

interface EditSessionModalProps {
  session: SessionWithCatches
  onClose: () => void
  onSuccess: () => void
}

const WATER_TYPES = [
  'Sea/Coastal',
  'River',
  'Lake/Reservoir',
  'Canal',
  'Pond',
]

const PRIVACY_OPTIONS = [
  { value: 'private', label: '🔒 Private', description: 'Location hidden from everyone' },
  { value: 'general', label: '📍 General Area', description: 'Show approximate location (~5km offset)' },
  { value: 'exact', label: '🎯 Exact Location', description: 'Show precise GPS coordinates' },
]

export function EditSessionModal({ session, onClose, onSuccess }: EditSessionModalProps) {
  const [title, setTitle] = useState(session.title || '')
  const [locationName, setLocationName] = useState(session.location_name || '')
  const [waterType, setWaterType] = useState(session.water_type || '')
  const [locationPrivacy, setLocationPrivacy] = useState(session.location_privacy || 'general')
  const [notes, setNotes] = useState((session as any).notes || '')

  const { mutateAsync: updateSession, isPending } = useUpdateSession()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateSession({
        id: session.id,
        title: title || undefined,
        location_name: locationName,
        water_type: waterType || undefined,
        location_privacy: locationPrivacy,
        notes: notes || undefined,
      } as any)
      toast.success('Session updated')
      onSuccess()
    } catch {
      toast.error('Failed to update session')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-bold text-gray-900">Edit Session</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Bass Session"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g., Brighton Marina"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Water Type
            </label>
            <select
              value={waterType}
              onChange={(e) => setWaterType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
            >
              <option value="">Select water type</option>
              {WATER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Privacy
            </label>
            <div className="space-y-2">
              {PRIVACY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    locationPrivacy === option.value
                      ? 'border-navy-800 bg-navy-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="privacy"
                    value={option.value}
                    checked={locationPrivacy === option.value}
                    onChange={(e) => setLocationPrivacy(e.target.value as 'private' | 'general' | 'exact')}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this session..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
