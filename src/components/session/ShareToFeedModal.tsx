import { useState } from 'react'
import { Loader2, Share2, User2, X } from 'lucide-react'
import { useCreatePost } from '../../hooks/usePosts'
import type { SessionWithCatches } from '../../types'

interface ShareToFeedModalProps {
  session: SessionWithCatches
  onClose: () => void
  onSuccess: () => void
  mode?: 'feed' | 'profile'
}

export function ShareToFeedModal({ session, onClose, onSuccess, mode = 'feed' }: ShareToFeedModalProps) {
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

  const catchCount = session.catches?.length ?? 0

  const title = mode === 'profile' ? 'Share to Profile' : 'Share to Feed'
  const primaryLabel = mode === 'profile' ? 'Share to Profile' : 'Share to Feed'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white md:max-w-lg md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-3 transition-colors hover:bg-gray-100 active:bg-gray-200 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Session Preview */}
        <div className="border-b border-gray-200 px-5 py-5">
          <div className="flex items-center gap-4">
            {session.cover_photo_url ? (
              <img
                src={session.cover_photo_url}
                alt={session.title ?? 'Session cover'}
                className="h-20 w-20 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-3xl">
                🎣
              </div>
            )}
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-900">{session.title || 'Fishing session'}</p>
              <p className="text-base text-gray-600 mt-1">
                🐟 {catchCount} catches · {session.location_name || 'Unknown location'}
              </p>
            </div>
          </div>
        </div>

        {/* Caption Input */}
        <div className="flex-1 px-5 py-5">
          <label className="mb-2 block text-sm font-semibold text-gray-900">
            Add a caption (optional)
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell the story of your session..."
            className="h-32 w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-4 text-base focus:border-navy-800 focus:outline-none focus:ring-0"
            maxLength={500}
          />
          <p className="mt-2 text-right text-sm text-gray-500">{caption.length}/500</p>
        </div>

        {/* Privacy Notice */}
        <div className="border-t border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-base text-blue-900">
            <span className="font-semibold">🔒 Privacy:</span>{' '}
            {session.location_privacy === 'private' && 'Location will be hidden'}
            {session.location_privacy === 'general' && 'Approximate location shown (±5km)'}
            {session.location_privacy === 'exact' && 'Exact location will be visible'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-gray-200 px-5 py-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-gray-300 px-4 py-4 text-base font-semibold text-gray-700 transition-all hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] min-h-[56px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-4 text-base font-semibold text-white transition-all hover:bg-navy-900 active:scale-[0.98] disabled:bg-navy-400 min-h-[56px]"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                {mode === 'profile' ? (
                  <User2 className="h-5 w-5" />
                ) : (
                  <Share2 className="h-5 w-5" />
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