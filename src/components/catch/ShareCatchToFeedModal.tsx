import { useState } from 'react'
import { Loader2, Share2, X } from 'lucide-react'
import { useCreatePost } from '../../hooks/usePosts'
import type { Catch } from '../../types'
import { useWeightFormatter } from '../../hooks/useWeightFormatter'

interface ShareCatchToFeedModalProps {
  catchItem: Catch
  onClose: () => void
  onSuccess: () => void
}

export function ShareCatchToFeedModal({ catchItem, onClose, onSuccess }: ShareCatchToFeedModalProps) {
  const [caption, setCaption] = useState('')
  const { mutate: createPost, isPending } = useCreatePost()
  const { formatWeight } = useWeightFormatter()

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
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card border border-border md:max-w-lg md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Catch Preview */}
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            {catchItem.photo_url ? (
              <img
                src={catchItem.photo_url}
                alt={catchItem.species}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-background text-2xl">
                🎣
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-foreground">{catchItem.species}</p>
              <p className="text-sm text-muted-foreground">
                {catchItem.weight_kg != null ? formatWeight(catchItem.weight_kg, { precision: 1 }) : 'Catch logged'} ·{' '}
                {catchItem.location_name || 'Unknown location'}
              </p>
            </div>
          </div>
        </div>

        {/* Caption Input */}
        <div className="flex-1 px-5 py-4">
          <label className="mb-2 block text-sm font-medium text-foreground">
            Add a caption (optional)
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell the story of this catch..."
            className="h-32 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            maxLength={500}
          />
          <p className="mt-2 text-right text-xs text-muted-foreground">{caption.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-3 font-semibold text-white transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-navy-400"
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
