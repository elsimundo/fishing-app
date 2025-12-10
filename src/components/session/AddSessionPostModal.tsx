import { useState } from 'react'
import { X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useCreatePost } from '../../hooks/usePosts'
import { useSession } from '../../hooks/useSession'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'

interface AddSessionPostModalProps {
  sessionId: string
  onClose: () => void
}

export function AddSessionPostModal({ sessionId, onClose }: AddSessionPostModalProps) {
  const [caption, setCaption] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: session } = useSession(sessionId)
  const { mutateAsync: createPost, isPending } = useCreatePost()

  const allowPosts = session?.allow_posts ?? true
  const allowComments = session?.allow_comments ?? true

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!caption.trim() && !photoFile) {
      toast.error('Please add a caption or photo')
      return
    }

    try {
      setUploading(true)

      let photoUrl: string | undefined

      // Upload photo if present
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `session-posts/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, photoFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath)
        photoUrl = urlData.publicUrl
      }

      // Create post
      await createPost({
        type: 'photo',
        session_id: sessionId,
        caption: caption.trim() || undefined,
        photo_url: photoUrl,
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
      <div className="w-full max-w-lg rounded-t-2xl bg-white sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Add to session</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
            disabled={uploading || isPending}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {!allowPosts && !allowComments ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-600">Posts and comments are disabled for this session.</p>
              <p className="mt-1 text-xs text-gray-500">The session owner can enable them in session settings.</p>
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
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                    rows={4}
                    disabled={uploading || isPending}
                  />
                </div>
              )}

          {/* Photo preview */}
          {photoPreview && (
            <div className="relative mb-4">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: '300px' }}
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                disabled={uploading || isPending}
              >
                <X size={16} />
              </button>
            </div>
          )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                {allowPosts && (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <ImageIcon size={18} />
                    <span>Add photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={uploading || isPending}
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={uploading || isPending || (!caption.trim() && !photoFile)}
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
