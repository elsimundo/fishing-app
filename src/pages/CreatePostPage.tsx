import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Image, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { compressPhoto } from '../utils/imageCompression'
import { useCreatePost } from '../hooks/usePosts'

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { mutateAsync: createPost } = useCreatePost()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const validFiles: File[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert('Please select image files only')
        continue
      }
      if (file.size > 50 * 1024 * 1024) {
        alert('Each image must be less than 50MB')
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    const nextFiles = [...imageFiles, ...validFiles].slice(0, 10)
    setImageFiles(nextFiles)

    const nextPreviews = [...imagePreviews]
    for (const f of validFiles) {
      if (nextPreviews.length >= 10) break
      nextPreviews.push(URL.createObjectURL(f))
    }
    setImagePreviews(nextPreviews)
  }

  const removeImageAt = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
    if (fileInputRef.current && imageFiles.length <= 1) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImages = async (): Promise<string[]> => {
    if (!user || imageFiles.length === 0) return []

    const urls: string[] = []
    for (const file of imageFiles) {
      const compressedFile = await compressPhoto(file)
      const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const filePath = `posts/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, compressedFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('posts').getPublicUrl(filePath)
      urls.push(data.publicUrl)
    }

    return urls
  }

  const handleSubmit = async () => {
    if (!content.trim() && imageFiles.length === 0) {
      alert('Please add some text or an image')
      return
    }

    if (!user) {
      alert('You must be logged in to post')
      return
    }

    setIsSubmitting(true)
    try {
      const mediaUrls = await uploadImages()

      await createPost({
        type: 'photo',
        caption: content.trim() || undefined,
        photo_url: mediaUrls[0],
        media_urls: mediaUrls,
        isPublic: true,
      })

      navigate('/feed')
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canPost = content.trim().length > 0 || imageFiles.length > 0

  return (
    <Layout>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={22} />
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost || isSubmitting}
            className="rounded-full bg-navy-800 px-5 py-2 text-sm font-bold text-white hover:bg-navy-900 disabled:bg-navy-400 disabled:text-white/60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Posting...
              </span>
            ) : (
              'Post'
            )}
          </button>
        </header>

        {/* Composer Card */}
        <div className="flex-1 bg-background p-4">
          <div className="rounded-2xl bg-card shadow-sm border border-border">
            {/* User info + textarea */}
            <div className="p-4">
              <div className="flex gap-3">
                {/* Avatar placeholder */}
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 text-lg font-bold text-white">
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </div>

                <div className="flex-1">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's happening on the water?"
                    className="min-h-[120px] w-full resize-none border-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder-muted-foreground focus:outline-none"
                    maxLength={500}
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Image Preview */}
            {imagePreviews.length > 0 && (
              <div className="px-4 pb-4">
                <div className="flex gap-3 overflow-x-auto">
                  {imagePreviews.map((src, idx) => (
                    <div key={src} className="relative flex-shrink-0">
                      <img
                        src={src}
                        alt={`Preview ${idx + 1}`}
                        className="h-40 w-40 rounded-2xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImageAt(idx)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions bar */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    imagePreviews.length > 0
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Image size={20} />
                  <span>{imagePreviews.length > 0 ? 'Add Photos' : 'Photos'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      content.length > 450
                        ? 'bg-red-500'
                        : content.length > 400
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((content.length / 500) * 100, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${content.length > 450 ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {500 - content.length}
                </span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-4 rounded-xl bg-blue-900/30 p-4 border border-blue-500/30">
            <p className="text-xs font-semibold text-blue-400">💡 Tips for a great post</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-400">
              <li>• Share your catch story or fishing conditions</li>
              <li>• Add a photo to get more engagement</li>
              <li>• Tag your location for local anglers</li>
            </ul>
          </div>
        </div>
      </main>
    </Layout>
  )
}
