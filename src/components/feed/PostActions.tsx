import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useIsPostLiked, usePostLikeCount, useToggleLike } from '../../hooks/usePostLikes'
import { BottomSheet } from '../ui/BottomSheet'
import { useAddPostComment, usePostComments } from '../../hooks/usePostComments'
import { useRepost } from '../../hooks/usePosts'

interface PostActionsProps {
  postId: string
  likeCount: number
  commentCount: number
  isLiked: boolean
}

export function PostActions({ postId, likeCount, commentCount, isLiked }: PostActionsProps) {
  const { user } = useAuth()
  const { mutate: toggleLike, isPending } = useToggleLike()
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const { data: comments = [], isLoading } = usePostComments(postId)
  const {
    mutateAsync: addComment,
    isPending: isAddingComment,
  } = useAddPostComment(postId)
  const [isRepostOpen, setIsRepostOpen] = useState(false)
  const [repostCaption, setRepostCaption] = useState('')
  const { mutateAsync: repost, isPending: isReposting } = useRepost()

  const { data: liveLikeCount } = usePostLikeCount(postId)
  const { data: liveIsLiked } = useIsPostLiked(postId, user?.id)

  const effectiveIsLiked = liveIsLiked ?? isLiked

  const handleLike = () => {
    if (!user || isPending) return
    void toggleLike(postId, effectiveIsLiked)
  }

  const handleOpenComments = () => {
    setIsCommentsOpen(true)
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim() || isAddingComment) return
    await addComment(newComment)
    setNewComment('')
  }

  const handleOpenRepost = () => {
    setIsRepostOpen(true)
  }

  const handleSubmitRepost = async () => {
    if (!user || isReposting) return
    await repost({ postId, caption: repostCaption })
    setRepostCaption('')
    setIsRepostOpen(false)
  }

  const effectiveLikeCount = liveLikeCount ?? likeCount
  const effectiveCommentCount = comments.length || commentCount
  const commentsTitle = comments.length > 0 ? `Comments (${comments.length})` : 'Comments'

  return (
    <div className="mt-3 flex items-center gap-5">
      <button
        type="button"
        onClick={handleLike}
        disabled={isPending}
        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-red-400 disabled:opacity-50"
      >
        <Heart size={20} className={effectiveIsLiked ? 'fill-red-500 text-red-500' : ''} />
        <span className="text-sm font-medium">{effectiveLikeCount}</span>
      </button>

      <button
        type="button"
        onClick={handleOpenComments}
        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
      >
        <MessageCircle size={20} />
        <span className="text-sm font-medium">{effectiveCommentCount}</span>
      </button>

      <button
        type="button"
        onClick={handleOpenRepost}
        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
      >
        <Send size={20} />
      </button>

      <BottomSheet open={isCommentsOpen} title={commentsTitle} onClose={() => setIsCommentsOpen(false)}>
        <div className="flex max-h-[65vh] flex-col gap-3 pb-2">
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading comments…</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet. Be the first to comment!</p>
            ) : (
              <ul className="space-y-3 text-xs">
                {comments.map((c) => {
                  const timeAgo = formatDistanceToNow(new Date(c.created_at), { addSuffix: true })
                  const userInitial = c.user.username?.[0]?.toUpperCase() || 'U'

                  return (
                    <li key={c.id} className="flex items-start gap-2">
                      {c.user.avatar_url ? (
                        <img
                          src={c.user.avatar_url}
                          alt={c.user.username ?? ''}
                          className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-[11px] font-semibold text-white">
                          {userInitial}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-foreground">
                            {c.user.username || c.user.full_name || 'Angler'}
                          </p>
                          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-foreground">{c.text}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div
            className="sticky bottom-0 rounded-xl border border-border bg-card p-2 shadow-sm"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
          >
            <div className="flex items-end gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
                className="h-16 flex-1 resize-none rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs shadow-inner focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted"
                disabled={!user || isAddingComment}
              />
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={!user || isAddingComment || !newComment.trim()}
                className="rounded-full bg-primary px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={isRepostOpen} title="Repost" onClose={() => setIsRepostOpen(false)}>
        <p className="mb-2 text-xs text-muted-foreground">
          Repost this catch or session to your own feed. Your followers will see it as a new post.
        </p>
        <textarea
          value={repostCaption}
          onChange={(e) => setRepostCaption(e.target.value)}
          placeholder="Add an optional caption…"
          className="h-20 w-full resize-none rounded-xl border border-border bg-background text-foreground px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          maxLength={280}
        />
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{repostCaption.length}/280</span>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsRepostOpen(false)}
            className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitRepost}
            disabled={!user || isReposting}
            className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
          >
            {isReposting ? 'Reposting…' : 'Repost to feed'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
