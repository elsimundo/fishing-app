import { useState } from 'react'
import { Loader2, Share2, User2, X } from 'lucide-react'
import { useCreatePost } from '../../hooks/usePosts'
import type { Catch } from '../../types'

interface ShareCatchToFeedModalProps {
  catchItem: Catch
  onClose: () => void
  onSuccess: () => void
  mode?: 'feed' | 'profile'
}

export function ShareCatchToFeedModal({ catchItem, onClose, onSuccess, mode = 'feed' }: ShareCatchToFeedModalProps) {
  const [caption, setCaption] = useState('')
  const { mutate: createPost, isPending } = useCreatePost()

  const handleShare = () => {
    if (isPending) return

    createPost(
      {
        type: 'catch',
        catch_id: catchItem.id,
        photo_url: catchItem.photo_url || undefined,
        caption: caption.trim() || undefined,
        isPublic: mode === 'profile' ? false : true,
      },
      {
        onSuccess: () => {
          onSuccess()
          onClose()
        },
      },
    )
  }

  const title = mode === 'profile' ? 'Share catch to profile' : 'Share catch to feed'
  const primaryLabel = mode === 'profile' ? 'Share to Profile' : 'Share to Feed'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white md:max-w-lg md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Catch Preview */}
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            {catchItem.photo_url ? (
              <img
                src={catchItem.photo_url}
                alt={catchItem.species}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                🎣
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{catchItem.species}</p>
              <p className="text-sm text-gray-600">
                {catchItem.weight_kg != null ? `${catchItem.weight_kg.toFixed(1)} kg` : 'Catch logged'} ·{' '}
                {catchItem.location_name || 'Unknown location'}
              </p>
            </div>
          </div>
        </div>

        {/* Caption Input */}
        <div className="flex-1 px-5 py-4">
          <label className="mb-2 block text-sm font-medium text-gray-900">
            Add a caption (optional)
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell the story of this catch..."
            className="h-32 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-navy-800"
            maxLength={500}
          />
          <p className="mt-2 text-right text-xs text-gray-500">{caption.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-500"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                {mode === 'profile' ? (
                  <User2 className="h-4 w-4" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                <span>{primaryLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
