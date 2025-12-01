import { Heart, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToggleLike } from '../../hooks/usePostLikes'

interface PostActionsProps {
  postId: string
  likeCount: number
  commentCount: number
  isLiked: boolean
}

export function PostActions({ postId, likeCount, commentCount, isLiked }: PostActionsProps) {
  const { user } = useAuth()
  const { mutate: toggleLike, isPending } = useToggleLike()

  const handleLike = () => {
    if (!user || isPending) return
    void toggleLike(postId, isLiked)
  }

  return (
    <div className="mt-3 flex items-center gap-5">
      <button
        type="button"
        onClick={handleLike}
        disabled={isPending}
        className="flex items-center gap-1.5 text-gray-600 transition-colors hover:text-red-600 disabled:opacity-50"
      >
        <Heart size={20} className={isLiked ? 'fill-red-600 text-red-600' : ''} />
        <span className="text-sm font-medium">{likeCount}</span>
      </button>

      <button
        type="button"
        className="flex items-center gap-1.5 text-gray-600 transition-colors hover:text-navy-800"
      >
        <MessageCircle size={20} />
        <span className="text-sm font-medium">{commentCount}</span>
      </button>

      <button
        type="button"
        className="flex items-center gap-1.5 text-gray-600 transition-colors hover:text-navy-800"
      >
        <Send size={20} />
      </button>
    </div>
  )
}
