import { useRef, useState } from 'react'
import { X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useCreatePost } from '../../hooks/usePosts'
import { useSession } from '../../hooks/useSession'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { compressPhoto } from '../../utils/imageCompression'

interface AddSessionPostModalProps {
  sessionId: string
  onClose: () => void
}

export function AddSessionPostModal({ sessionId, onClose }: AddSessionPostModalProps) {
  const [caption, setCaption] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: session } = useSession(sessionId)
  const { mutateAsync: createPost, isPending } = useCreatePost()

  const allowPosts = session?.allow_posts ?? true
  const allowComments = session?.allow_comments ?? true

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const validFiles: File[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select image files only')
        continue
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Each image must be less than 50MB')
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    const nextFiles = [...photoFiles, ...validFiles].slice(0, 10)
    setPhotoFiles(nextFiles)

    const nextPreviews = [...photoPreviews]
    for (const f of validFiles) {
      if (nextPreviews.length >= 10) break
      nextPreviews.push(URL.createObjectURL(f))
    }
    setPhotoPreviews(nextPreviews)
  }

  const handleRemovePhotoAt = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
    if (fileInputRef.current && photoFiles.length <= 1) {
      fileInputRef.current.value = ''
    }
  }

  const uploadPhotos = async (): Promise<string[]> => {
    if (photoFiles.length === 0) return []

    const urls: string[] = []
    for (const file of photoFiles) {
      const compressedFile = await compressPhoto(file)
      const fileExt = 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = `session-posts/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, compressedFile)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath)
      urls.push(urlData.publicUrl)
    }

    return urls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!caption.trim() && photoFiles.length === 0) {
      toast.error('Please add a caption or photo')
      return
    }

    try {
      setUploading(true)

      const mediaUrls = await uploadPhotos()

      // Create post
      await createPost({
        type: 'photo',
        session_id: sessionId,
        caption: caption.trim() || undefined,
        photo_url: mediaUrls[0],
        media_urls: mediaUrls,
        isPublic: true,
      })

      toast.success('Post added to session!')
      onClose()
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to add post')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-lg rounded-t-2xl bg-card border border-border sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">Add to session</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-muted"
            disabled={uploading || isPending}
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {!allowPosts && !allowComments ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Posts and comments are disabled for this session.</p>
              <p className="mt-1 text-xs text-muted-foreground">The session owner can enable them in session settings.</p>
            </div>
          ) : (
            <>
              {/* Caption */}
              {allowComments && (
                <div className="mb-4">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="What's happening? Add a comment or update..."
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={4}
                    disabled={uploading || isPending}
                  />
                </div>
              )}

          {/* Photo preview */}
          {photoPreviews.length > 0 && (
            <div className="mb-4 flex gap-3 overflow-x-auto">
              {photoPreviews.map((src, idx) => (
                <div key={src} className="relative flex-shrink-0">
                  <img
                    src={src}
                    alt={`Preview ${idx + 1}`}
                    className="h-40 w-40 rounded-2xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhotoAt(idx)}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                    disabled={uploading || isPending}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                {allowPosts && (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                    <ImageIcon size={18} />
                    <span>{photoPreviews.length > 0 ? 'Add photos' : 'Add photo'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={uploading || isPending}
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={uploading || isPending || (!caption.trim() && photoFiles.length === 0)}
                  className="flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
                >
                  {uploading || isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post'
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
