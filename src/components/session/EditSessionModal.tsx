import { useState } from 'react'
import { X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useUpdateSession } from '../../hooks/useUpdateSession'
import { supabase } from '../../lib/supabase'
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
  const [waterType, setWaterType] = useState(() => {
    const raw = (session.water_type as string | null) || ''
    if (!raw) return ''

    // If already one of our options, use it directly
    if (WATER_TYPES.includes(raw)) return raw

    const lower = raw.toLowerCase()

    if (lower.includes('sea') || lower.includes('coast')) return 'Sea/Coastal'
    if (lower.includes('river')) return 'River'
    if (lower.includes('lake') || lower.includes('reservoir')) return 'Lake/Reservoir'
    if (lower.includes('canal')) return 'Canal'
    if (lower.includes('pond')) return 'Pond'

    // Fallback to raw value
    return raw
  })
  const [locationPrivacy, setLocationPrivacy] = useState(session.location_privacy || 'general')
  const [notes, setNotes] = useState((session as any).notes || '')
  const [allowPosts, setAllowPosts] = useState(session.allow_posts ?? true)
  const [allowComments, setAllowComments] = useState(session.allow_comments ?? true)
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(session.cover_photo_url || null)
  const [uploading, setUploading] = useState(false)

  const { mutateAsync: updateSession, isPending } = useUpdateSession()

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setCoverPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setCoverPhotoFile(null)
    setCoverPhotoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setUploading(true)
      let coverPhotoUrl = session.cover_photo_url

      // Upload new cover photo if selected
      if (coverPhotoFile) {
        const fileExt = coverPhotoFile.name.split('.').pop()
        const fileName = `${session.id}-${Date.now()}.${fileExt}`
        const filePath = `session-covers/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, coverPhotoFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath)
        coverPhotoUrl = urlData.publicUrl
      } else if (coverPhotoPreview === null && session.cover_photo_url) {
        // User removed the photo
        coverPhotoUrl = null
      }

      await updateSession({
        id: session.id,
        title: title || undefined,
        location_name: locationName,
        water_type: waterType || undefined,
        location_privacy: locationPrivacy,
        notes: notes || undefined,
        allow_posts: allowPosts,
        allow_comments: allowComments,
        cover_photo_url: coverPhotoUrl,
      } as any)
      toast.success('Session updated')
      onSuccess()
    } catch (error) {
      console.error('Error updating session:', error)
      toast.error('Failed to update session')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">Edit Session</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Cover Photo */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Cover Photo (optional)
            </label>
            {coverPhotoPreview ? (
              <div className="relative">
                <img
                  src={coverPhotoPreview}
                  alt="Cover preview"
                  className="w-full h-40 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background p-6 hover:bg-muted">
                <ImageIcon size={32} className="text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">Upload cover photo</p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={uploading || isPending}
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Session Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Bass Session"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Location
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g., Brighton Marina"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Water Type
            </label>
            <select
              value={waterType}
              onChange={(e) => setWaterType(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Location Privacy
            </label>
            <div className="space-y-2">
              {PRIVACY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    locationPrivacy === option.value
                      ? 'border-primary bg-primary/20'
                      : 'border-border hover:border-primary/50'
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
                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this session..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Post & Comment Settings */}
          <div className="space-y-3 rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium text-foreground">Timeline Settings</p>
            
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Allow image posts</p>
                <p className="text-xs text-muted-foreground">Participants can add photos to the timeline</p>
              </div>
              <input
                type="checkbox"
                checked={allowPosts}
                onChange={(e) => setAllowPosts(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Allow text comments</p>
                <p className="text-xs text-muted-foreground">Participants can add text updates to the timeline</p>
              </div>
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || uploading}
              className="flex-1 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </span>
              ) : isPending ? (
                'Saving...'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
