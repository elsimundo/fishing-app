import { useState } from 'react'
import { Loader2, Share2, X } from 'lucide-react'
import { useCreatePost } from '../../hooks/usePosts'
import type { SessionWithCatches } from '../../types'

interface ShareToFeedModalProps {
  session: SessionWithCatches
  onClose: () => void
  onSuccess: () => void
}

export function ShareToFeedModal({ session, onClose, onSuccess }: ShareToFeedModalProps) {
  const [caption, setCaption] = useState('')
  const { mutate: createPost, isPending } = useCreatePost()

  const handleShare = () => {
    if (isPending) return

    createPost(
      {
        type: 'session',
        session_id: session.id,
        photo_url: session.cover_photo_url || undefined,
        caption: caption.trim() || undefined,
        location_privacy: session.location_privacy || 'general',
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

  const catchCount = session.catches?.length ?? 0

  const title = 'Share Session'
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

        {/* Session Preview */}
        <div className="border-b border-[#334155] px-5 py-4">
          <div className="flex items-center gap-3">
            {session.cover_photo_url ? (
              <img
                src={session.cover_photo_url}
                alt={session.title ?? 'Session cover'}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#1A2D3D] text-2xl">
                🎣
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-white">{session.title || 'Fishing session'}</p>
              <p className="text-sm text-gray-400">
                {catchCount} catches · {session.location_name || 'Unknown location'}
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
            placeholder="Tell the story of your session... What did you catch? How was the weather?"
            className="h-32 w-full resize-none rounded-xl border border-[#334155] bg-[#1A2D3D] px-4 py-3 text-sm text-white focus:border-[#1BA9A0] focus:outline-none focus:ring-2 focus:ring-[#1BA9A0]/20"
            maxLength={500}
          />
          <p className="mt-2 text-right text-xs text-gray-500">{caption.length}/500</p>
        </div>

        {/* Privacy Notice */}
        <div className="border-t border-blue-500/40 bg-blue-900/30 px-5 py-3">
          <p className="text-sm text-blue-300">
            <span className="font-semibold">Privacy:</span>{' '}
            {session.location_privacy === 'private' && 'Location will be hidden'}
            {session.location_privacy === 'general' && 'Approximate location shown (±5km)'}
            {session.location_privacy === 'exact' && 'Exact location will be visible'}
          </p>
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