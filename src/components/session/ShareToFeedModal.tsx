import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
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
        caption: caption.trim() || undefined,
        location_privacy: session.location_privacy || 'general',
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white md:max-w-lg md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Share to Feed</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Session Preview */}
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            {session.cover_photo_url ? (
              <img
                src={session.cover_photo_url}
                alt={session.title ?? 'Session cover'}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                🎣
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{session.title || 'Fishing session'}</p>
              <p className="text-sm text-gray-600">
                {catchCount} catches · {session.location_name || 'Unknown location'}
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
            placeholder="Tell the story of your session... What did you catch? How was the weather?"
            className="h-32 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-navy-800"
            maxLength={500}
          />
          <p className="mt-2 text-right text-xs text-gray-500">{caption.length}/500</p>
        </div>

        {/* Privacy Notice */}
        <div className="border-t border-blue-100 bg-blue-50 px-5 py-3">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Privacy:</span>{' '}
            {session.location_privacy === 'private' && 'Location will be hidden'}
            {session.location_privacy === 'general' && 'Approximate location shown (±5km)'}
            {session.location_privacy === 'exact' && 'Exact location will be visible'}
          </p>
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
              'Share to Feed'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}