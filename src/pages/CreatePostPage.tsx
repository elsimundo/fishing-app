import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Image, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { compressPhoto } from '../utils/imageCompression'

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Image must be less than 50MB')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null

    // Compress the image before upload
    const compressedFile = await compressPhoto(imageFile)
    
    const fileName = `${user.id}-${Date.now()}.jpg`
    const filePath = `posts/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(filePath, compressedFile)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('posts').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) {
      alert('Please add some text or an image')
      return
    }

    if (!user) {
      alert('You must be logged in to post')
      return
    }

    setIsSubmitting(true)
    try {
      let imageUrl: string | null = null
      if (imageFile) {
        imageUrl = await uploadImage()
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        caption: content.trim() || null,
        photo_url: imageUrl,
        type: 'photo',
        is_public: true,
      })

      if (error) throw error

      navigate('/feed')
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canPost = content.trim().length > 0 || imageFile !== null

  return (
    <Layout>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={22} />
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost || isSubmitting}
            className="rounded-full bg-navy-800 px-5 py-2 text-sm font-bold text-white hover:bg-navy-900 disabled:bg-gray-300 disabled:text-gray-500"
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
        <div className="flex-1 bg-gray-50 p-4">
          <div className="rounded-2xl bg-white shadow-sm">
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
                    className="min-h-[120px] w-full resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-900 placeholder-gray-400 focus:outline-none"
                    maxLength={500}
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative px-4 pb-4">
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-96 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Actions bar */}
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    imagePreview
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Image size={20} />
                  <span>{imagePreview ? 'Change' : 'Photo'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
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
                <span className={`text-xs font-medium ${content.length > 450 ? 'text-red-500' : 'text-gray-400'}`}>
                  {500 - content.length}
                </span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-4 rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-800">💡 Tips for a great post</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-700">
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
