import { useState } from 'react'
import { Loader2, Share2, X } from 'lucide-react'
import { useCreatePost } from '../../hooks/usePosts'
import type { Catch } from '../../types'

interface ShareCatchToFeedModalProps {
  catchItem: Catch
  onClose: () => void
  onSuccess: () => void
}

export function ShareCatchToFeedModal({ catchItem, onClose, onSuccess }: ShareCatchToFeedModalProps) {
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
        isPublic: true,
      },
      {
        onSuccess: () => {
          onSuccess()
          onClose()
        },
      },
    )
  }

  const title = 'Share Catch'
  const primaryLabel = 'Share'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#243B4A] border border-[#334155] md:max-w-lg md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#334155] px-5 py-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-[#334155]"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Catch Preview */}
        <div className="border-b border-[#334155] px-5 py-4">
          <div className="flex items-center gap-3">
            {catchItem.photo_url ? (
              <img
                src={catchItem.photo_url}
                alt={catchItem.species}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#1A2D3D] text-2xl">
                🎣
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-white">{catchItem.species}</p>
              <p className="text-sm text-gray-400">
                {catchItem.weight_kg != null ? `${catchItem.weight_kg.toFixed(1)} kg` : 'Catch logged'} ·{' '}
                {catchItem.location_name || 'Unknown location'}
              </p>
            </div>
          </div>
        </div>

        {/* Caption Input */}
        <div className="flex-1 px-5 py-4">
          <label className="mb-2 block text-sm font-medium text-white">
            Add a caption (optional)
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell the story of this catch..."
            className="h-32 w-full resize-none rounded-xl border border-[#334155] bg-[#1A2D3D] px-4 py-3 text-sm text-white focus:border-[#1BA9A0] focus:outline-none focus:ring-2 focus:ring-[#1BA9A0]/20"
            maxLength={500}
          />
          <p className="mt-2 text-right text-xs text-gray-500">{caption.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-[#334155] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#334155] bg-[#1A2D3D] px-4 py-3 font-semibold text-gray-300 transition-colors hover:bg-[#334155]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1BA9A0] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#14B8A6] disabled:cursor-not-allowed disabled:bg-[#334155]"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>{primaryLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
