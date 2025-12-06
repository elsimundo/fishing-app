import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ArrowLeft, Image, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

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

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB')
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

    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `posts/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(filePath, imageFile)

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
        content: content.trim() || null,
        image_url: imageUrl,
        type: 'photo',
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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <h1 className="text-base font-bold text-gray-900">Share Update</h1>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost || isSubmitting}
            className="rounded-full bg-navy-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Post'
            )}
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Share a fishing story, tip, or update..."
            className="min-h-[150px] w-full resize-none border-none text-base text-gray-900 placeholder-gray-400 focus:outline-none"
            maxLength={500}
            autoFocus
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mt-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-80 w-full rounded-xl object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                <Image size={18} />
                <span>Add Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <p className="text-xs text-gray-500">{content.length}/500</p>
          </div>
        </div>
      </main>
    </Layout>
  )
}
