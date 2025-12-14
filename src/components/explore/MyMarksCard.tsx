import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, Navigation, Loader2, X, Share2, MapPin, Crosshair, Waves, TreePine, Droplets, Ship, Flower2, Building2 } from 'lucide-react'
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

const WATER_TYPE_ICONS: Record<SavedMarkWaterType, React.ReactNode> = {
  sea: <Waves size={14} className="text-blue-400" />,
  coastal: <Waves size={14} className="text-cyan-400" />,
  river: <TreePine size={14} className="text-emerald-400" />,
  lake: <Droplets size={14} className="text-sky-400" />,
  canal: <Ship size={14} className="text-slate-400" />,
  pond: <Flower2 size={14} className="text-green-400" />,
  reservoir: <Building2 size={14} className="text-gray-400" />,
  other: <MapPin size={14} className="text-muted-foreground" />,
}

interface MyMarksCardProps {
  onSelectMark?: (mark: SavedMark) => void
  onAddMark?: () => void // Callback to open map for adding
  onShowOnMap?: (mark: SavedMark) => void // Callback to center map on mark
}

export function MyMarksCard({ onSelectMark, onAddMark, onShowOnMap }: MyMarksCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine')
  const [sharingMark, setSharingMark] = useState<SavedMark | null>(null)
  const { marks, isLoading, createMark, deleteMark } = useSavedMarks()
  const { data: sharedMarks, isLoading: sharedLoading } = useSharedMarks()

  const hasMarks = marks.length > 0
  const hasSharedMarks = (sharedMarks?.length || 0) > 0

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted"
      >
        <div className="flex items-center gap-3">
          <MapPin size={20} className="text-red-400" />
          <div className="text-left">
            <span className="text-sm font-medium text-foreground">My Marks</span>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Loading...' : `${marks.length} saved${hasSharedMarks ? `, ${sharedMarks?.length} shared` : ''}`}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={20} className="text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4">
          {/* Tabs */}
          {hasSharedMarks && (
            <div className="mt-3 flex rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setActiveTab('mine')}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'mine'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground/70 hover:text-foreground'
                }`}
              >
                My Marks ({marks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('shared')}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'shared'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground/70 hover:text-foreground'
                }`}
              >
                <Share2 size={12} className="inline mr-1" />
                Shared ({sharedMarks?.length || 0})
              </button>
            </div>
          )}

          {(isLoading || sharedLoading) ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : activeTab === 'mine' ? (
            // My Marks tab
            !hasMarks && !showAddForm ? (
              <div className="mt-3 rounded-lg bg-muted p-4 text-center">
                <span className="text-3xl">📍</span>
                <p className="mt-2 text-sm font-medium text-foreground">No saved marks yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Save your favourite fishing spots for quick access
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
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
                    className="flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground"
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
                    // Always allow sharing for your own marks (private, public, or friends)
                    onShare={() => {
                      setSharingMark(mark)
                    }}
                    onShowOnMap={onShowOnMap}
                  />
                ))}
              </div>
            )
          ) : (
            // Shared with me tab
            <div className="mt-3 space-y-2">
              {!hasSharedMarks ? (
                <div className="rounded-lg bg-muted p-4 text-center">
                  <span className="text-3xl">🤝</span>
                  <p className="mt-2 text-sm font-medium text-foreground">No shared marks</p>
                  <p className="mt-1 text-xs text-muted-foreground">
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
                    onShowOnMap={onShowOnMap}
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
  onShowOnMap?: (mark: SavedMark) => void
}

function MarkItem({ mark, onSelect, onDelete, isDeleting, onShare, isShared, sharedByName, onShowOnMap }: MarkItemProps) {
  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted"
      onClick={() => onSelect?.(mark)}
    >
      <span className="text-lg">{WATER_TYPE_ICONS[mark.water_type]}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{mark.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{WATER_TYPE_LABELS[mark.water_type]}</span>
          {isShared && sharedByName && (
            <span className="rounded bg-green-100 dark:bg-green-900/30 px-1 py-0.5 text-[10px] text-green-600 dark:text-green-400">
              from {sharedByName}
            </span>
          )}
          {!isShared && mark.privacy_level !== 'private' && (
            <span className={`rounded px-1 py-0.5 text-[10px] ${
              mark.privacy_level === 'public' 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            }`}>
              {mark.privacy_level === 'public' ? 'Public' : 'Shared'}
            </span>
          )}
        </div>
        {mark.notes && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{mark.notes}</p>
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
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Share with friends"
            style={{ color: '#374151' }}
          >
            <Share2 size={14} />
          </button>
        )}
        {onShowOnMap && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onShowOnMap(mark)
            }}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Show on map"
            style={{ color: '#374151' }}
          >
            <Crosshair size={14} />
          </button>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${mark.latitude},${mark.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Get directions"
          style={{ color: '#374151' }}
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
            className="rounded-lg p-2 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400 disabled:opacity-50"
            style={{ color: '#374151' }}
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Add New Mark</h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. The Wreck, Bass Rock"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Location section */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Location *</label>
        
        {coords.lat !== null && coords.lng !== null ? (
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-500/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-400">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-card py-2.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Navigation size={14} />
              Use my current location
            </button>
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-xs font-medium text-foreground hover:bg-muted"
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
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Drop a pin</h3>
              <button type="button" onClick={() => setShowMap(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="h-64">
              <LocationPicker
                value={coords}
                onChange={(newCoords) => setCoords(newCoords)}
              />
            </div>
            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="w-full rounded-lg bg-navy-800 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Water Type</label>
        <select
          value={waterType}
          onChange={(e) => setWaterType(e.target.value as SavedMarkWaterType)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          {Object.entries(WATER_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {WATER_TYPE_ICONS[value as SavedMarkWaterType]} {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this spot..."
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Privacy</label>
        <select
          value={privacyLevel}
          onChange={(e) => setPrivacyLevel(e.target.value as MarkPrivacyLevel)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
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
          className="flex-1 rounded-lg border border-border bg-muted py-2 text-xs font-medium text-foreground hover:bg-muted/70"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="flex-1 rounded-lg bg-navy-800 py-2 text-xs font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
        >
          {isSubmitting ? 'Saving...' : 'Save Mark'}
        </button>
      </div>
    </form>
  )
}

export { AddMarkForm }
