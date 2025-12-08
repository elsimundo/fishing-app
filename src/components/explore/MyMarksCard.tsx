import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, Navigation, Loader2, X, Share2, MapPin } from 'lucide-react'
import { useSavedMarks, useSharedMarks } from '../../hooks/useSavedMarks'
import type { CreateMarkInput } from '../../hooks/useSavedMarks'
import type { SavedMark, SavedMarkWaterType, MarkPrivacyLevel } from '../../types'
import { ShareMarkModal } from '../marks/ShareMarkModal'
import { LocationPicker } from '../map/LocationPicker'

const WATER_TYPE_LABELS: Record<SavedMarkWaterType, string> = {
  sea: 'Sea',
  coastal: 'Coastal',
  river: 'River',
  lake: 'Lake',
  canal: 'Canal',
  pond: 'Pond',
  reservoir: 'Reservoir',
  other: 'Other',
}

const WATER_TYPE_ICONS: Record<SavedMarkWaterType, string> = {
  sea: '🌊',
  coastal: '🏖️',
  river: '🏞️',
  lake: '💧',
  canal: '🚣',
  pond: '🪷',
  reservoir: '🏗️',
  other: '📍',
}

interface MyMarksCardProps {
  onSelectMark?: (mark: SavedMark) => void
  onAddMark?: () => void // Callback to open map for adding
}

export function MyMarksCard({ onSelectMark, onAddMark }: MyMarksCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine')
  const [sharingMark, setSharingMark] = useState<SavedMark | null>(null)
  const { marks, isLoading, createMark, deleteMark } = useSavedMarks()
  const { data: sharedMarks, isLoading: sharedLoading } = useSharedMarks()

  const hasMarks = marks.length > 0
  const hasSharedMarks = (sharedMarks?.length || 0) > 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📍</span>
          <div className="text-left">
            <span className="text-sm font-medium text-gray-900">My Marks</span>
            <p className="text-xs text-gray-500">
              {isLoading ? 'Loading...' : `${marks.length} saved${hasSharedMarks ? `, ${sharedMarks?.length} shared` : ''}`}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {/* Tabs */}
          {hasSharedMarks && (
            <div className="mt-3 flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('mine')}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'mine'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Marks ({marks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('shared')}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'shared'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Share2 size={12} className="inline mr-1" />
                Shared ({sharedMarks?.length || 0})
              </button>
            </div>
          )}

          {(isLoading || sharedLoading) ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : activeTab === 'mine' ? (
            // My Marks tab
            !hasMarks && !showAddForm ? (
              <div className="mt-3 rounded-lg bg-gray-50 p-4 text-center">
                <span className="text-3xl">📍</span>
                <p className="mt-2 text-sm font-medium text-gray-600">No saved marks yet</p>
                <p className="mt-1 text-xs text-gray-500">
                  Save your favourite fishing spots for quick access
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90"
                >
                  <Plus size={14} />
                  Add your first mark
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {/* Add button */}
                {!showAddForm && (
                  <button
                    type="button"
                    onClick={onAddMark || (() => setShowAddForm(true))}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-200 py-2 text-xs font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  >
                    <Plus size={14} />
                    Add new mark
                  </button>
                )}

                {/* Add form */}
                {showAddForm && (
                  <AddMarkForm
                    onSubmit={(input) => {
                      createMark.mutate(input, {
                        onSuccess: () => setShowAddForm(false),
                      })
                    }}
                    onCancel={() => setShowAddForm(false)}
                    isSubmitting={createMark.isPending}
                  />
                )}

                {/* Marks list */}
                {marks.map((mark) => (
                  <MarkItem
                    key={mark.id}
                    mark={mark}
                    onSelect={onSelectMark}
                    onDelete={() => deleteMark.mutate(mark.id)}
                    isDeleting={deleteMark.isPending}
                    onShare={mark.privacy_level === 'friends' ? () => {
                      setSharingMark(mark)
                    } : undefined}
                  />
                ))}
              </div>
            )
          ) : (
            // Shared with me tab
            <div className="mt-3 space-y-2">
              {!hasSharedMarks ? (
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <span className="text-3xl">🤝</span>
                  <p className="mt-2 text-sm font-medium text-gray-600">No shared marks</p>
                  <p className="mt-1 text-xs text-gray-500">
                    When friends share marks with you, they'll appear here
                  </p>
                </div>
              ) : (
                sharedMarks?.map((mark) => (
                  <MarkItem
                    key={mark.id}
                    mark={mark as unknown as SavedMark}
                    onSelect={onSelectMark}
                    onDelete={() => {}} // Can't delete shared marks
                    isDeleting={false}
                    isShared
                    sharedByName={(mark.shared_by_user as { username?: string } | undefined)?.username}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      {sharingMark && (
        <ShareMarkModal
          mark={sharingMark}
          onClose={() => setSharingMark(null)}
        />
      )}
    </div>
  )
}

interface MarkItemProps {
  mark: SavedMark
  onSelect?: (mark: SavedMark) => void
  onDelete: () => void
  isDeleting: boolean
  onShare?: () => void
  isShared?: boolean
  sharedByName?: string
}

function MarkItem({ mark, onSelect, onDelete, isDeleting, onShare, isShared, sharedByName }: MarkItemProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 cursor-pointer hover:bg-gray-100"
      onClick={() => onSelect?.(mark)}
    >
      <span className="text-lg">{WATER_TYPE_ICONS[mark.water_type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{mark.name}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{WATER_TYPE_LABELS[mark.water_type]}</span>
          {isShared && sharedByName && (
            <span className="rounded bg-green-100 px-1 py-0.5 text-[10px] text-green-700">
              from {sharedByName}
            </span>
          )}
          {!isShared && mark.privacy_level !== 'private' && (
            <span className={`rounded px-1 py-0.5 text-[10px] ${
              mark.privacy_level === 'public' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-purple-100 text-purple-700'
            }`}>
              {mark.privacy_level === 'public' ? 'Public' : 'Shared'}
            </span>
          )}
        </div>
        {mark.notes && (
          <p className="mt-1 text-xs text-gray-500 truncate">{mark.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onShare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onShare()
            }}
            className="rounded-lg p-2 text-gray-400 hover:bg-purple-100 hover:text-purple-600"
            title="Share with friends"
          >
            <Share2 size={14} />
          </button>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${mark.latitude},${mark.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        >
          <Navigation size={14} />
        </a>
        {!isShared && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            disabled={isDeleting}
            className="rounded-lg p-2 text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

interface AddMarkFormProps {
  onSubmit: (input: CreateMarkInput) => void
  onCancel: () => void
  isSubmitting: boolean
  initialLat?: number
  initialLng?: number
}

function AddMarkForm({ onSubmit, onCancel, isSubmitting, initialLat, initialLng }: AddMarkFormProps) {
  const [name, setName] = useState('')
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: initialLat ?? null,
    lng: initialLng ?? null,
  })
  const [showMap, setShowMap] = useState(false)
  const [waterType, setWaterType] = useState<SavedMarkWaterType>('sea')
  const [notes, setNotes] = useState('')
  const [privacyLevel, setPrivacyLevel] = useState<MarkPrivacyLevel>('private')

  const canSubmit = name.trim() && coords.lat !== null && coords.lng !== null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || coords.lat === null || coords.lng === null) return

    onSubmit({
      name: name.trim(),
      latitude: coords.lat,
      longitude: coords.lng,
      water_type: waterType,
      notes: notes.trim() || undefined,
      privacy_level: privacyLevel,
    })
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        alert('Could not get location: ' + err.message)
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Add New Mark</h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. The Wreck, Bass Rock"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {/* Location section */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
        
        {coords.lat !== null && coords.lng !== null ? (
          <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-green-600" />
              <span className="text-xs text-green-700">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="text-xs text-green-600 hover:text-green-800 font-medium"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="w-full rounded-lg bg-gray-100 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-200 flex items-center justify-center gap-2"
            >
              <Navigation size={14} />
              Use my current location
            </button>
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <MapPin size={14} />
              Drop pin on map
            </button>
          </div>
        )}
      </div>

      {/* Map picker modal */}
      {showMap && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Drop a pin</h3>
              <button type="button" onClick={() => setShowMap(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="h-64">
              <LocationPicker
                value={coords}
                onChange={(newCoords) => setCoords(newCoords)}
              />
            </div>
            <div className="border-t px-4 py-3">
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="w-full rounded-lg bg-navy-800 py-2 text-sm font-semibold text-white hover:bg-navy-900"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Water Type</label>
        <select
          value={waterType}
          onChange={(e) => setWaterType(e.target.value as SavedMarkWaterType)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          {Object.entries(WATER_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {WATER_TYPE_ICONS[value as SavedMarkWaterType]} {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this spot..."
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Privacy</label>
        <select
          value={privacyLevel}
          onChange={(e) => setPrivacyLevel(e.target.value as MarkPrivacyLevel)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="private">🔒 Private - Only you</option>
          <option value="friends">👥 Friends - Share with specific people</option>
          <option value="public">🌍 Public - Anyone can see (location offset applied)</option>
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:bg-primary/60"
        >
          {isSubmitting ? 'Saving...' : 'Save Mark'}
        </button>
      </div>
    </form>
  )
}

export { AddMarkForm }
