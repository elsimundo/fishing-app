import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PostWithUser } from '../../types'
import { PostHeader } from './PostHeader'
import { PostActions } from './PostActions'
import { useDeletePost } from '../../hooks/usePosts'
import { useAuth } from '../../hooks/useAuth'
import { Trash2, MoreHorizontal } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useWeightFormatter } from '../../hooks/useWeightFormatter'

interface FeedPostCardProps {
  post: PostWithUser
  showVisibility?: boolean
  onToggleVisibility?: (postId: string, nextIsPublic: boolean) => void
}

export function FeedPostCard({ post, showVisibility, onToggleVisibility }: FeedPostCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost()
  const [showMenu, setShowMenu] = useState(false)
  const { formatWeight } = useWeightFormatter()

  type StatTile = { label: string; value: string }

  const catchStatTiles: StatTile[] =
    post.type === 'catch' && post.catch
      ? [
          post.catch.weight_kg != null
            ? {
                label: 'Weight',
                value: formatWeight(post.catch.weight_kg, { precision: 1 }),
              }
            : null,
          post.catch.length_cm != null
            ? {
                label: 'Length',
                value: `${post.catch.length_cm.toFixed(1)} cm`,
              }
            : null,
          post.catch.bait
            ? {
                label: 'Bait',
                value: post.catch.bait,
              }
            : null,
          post.catch.rig
            ? {
                label: 'Rig',
                value: post.catch.rig,
              }
            : null,
        ].filter((t): t is StatTile => Boolean(t))
      : []

  const isOwnPost = user?.id === post.user_id

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return
    
    deletePost(post.id, {
      onSuccess: () => {
        toast.success('Post deleted')
        setShowMenu(false)
      },
      onError: () => {
        toast.error('Failed to delete post')
      },
    })
  }

  const getCoverImage = () => {
    if (post.photo_url) return post.photo_url
    if (post.session?.cover_photo_url) return post.session.cover_photo_url
    const sessionFirstCatchPhotoUrl = (post.session as any)?.catches?.[0]?.photo_url as string | undefined
    if (sessionFirstCatchPhotoUrl) return sessionFirstCatchPhotoUrl
    if (post.catch?.photo_url) return post.catch.photo_url
    return null
  }

  const coverImage = getCoverImage()

  const handleCardClick = () => {
    if (post.type === 'session' && post.session_id) {
      navigate(`/sessions/${post.session_id}`)
      return
    }

    if (post.type === 'catch' && post.catch_id) {
      navigate(`/catches/${post.catch_id}`)
    }
  }

  return (
    <article className="relative bg-card px-5 py-4 border-b border-border">
      {/* Post Menu for own posts */}
      {isOwnPost && (
        <div className="absolute right-4 top-4">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal size={18} />
          </button>
          
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-background py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <PostHeader
        user={post.user}
        createdAt={post.created_at}
        onUserClick={() => {
          if (post.user.username) {
            navigate(`/${post.user.username}`)
          } else {
            navigate(`/profile/${post.user.id}`)
          }
        }}
      />

      {showVisibility ? (
        <div className="mt-1 flex justify-end">
          {onToggleVisibility ? (
            <button
              type="button"
              onClick={() => onToggleVisibility(post.id, !post.is_public)}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                post.is_public ? 'bg-emerald-900/30 text-emerald-400' : 'bg-muted text-muted-foreground'
              }`}
            >
              {post.is_public ? 'Public' : 'Private'}
            </button>
          ) : (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                post.is_public ? 'bg-emerald-900/30 text-emerald-400' : 'bg-muted text-muted-foreground'
              }`}
            >
              {post.is_public ? 'Public' : 'Private'}
            </span>
          )}
        </div>
      ) : null}

      {coverImage && (
        <div className="-mx-5 my-3 cursor-pointer" onClick={handleCardClick}>
          <img
            src={coverImage}
            alt="Post cover"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      )}

      {post.caption && (
        <p className="text-[15px] leading-relaxed text-foreground">{post.caption}</p>
      )}

      {post.type === 'catch' && post.catch && catchStatTiles.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4 sm:text-xs">
          {catchStatTiles.map((tile) => (
            <div key={tile.label} className="rounded-xl bg-background px-2 py-2">
              <p className="text-[10px] text-muted-foreground">{tile.label}</p>
              <p className="text-sm font-semibold text-foreground truncate">{tile.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {post.type === 'session' && post.session && (
        <div
          className="mt-3 cursor-pointer rounded-xl bg-background p-3 transition-colors hover:bg-muted"
          onClick={handleCardClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {post.session.title || 'Fishing Session'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {((post.session as any)?.catches?.length as number | undefined) || 0} catches ·{' '}
                {post.session.location_name || 'Unknown location'}
              </p>
            </div>
            <div className="text-2xl">🎣</div>
          </div>
        </div>
      )}

      {post.type === 'catch' && post.catch && (
        <div
          className="mt-3 cursor-pointer rounded-xl bg-background p-3 transition-colors hover:bg-muted"
          onClick={handleCardClick}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{post.catch.species}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {post.catch.weight_kg != null
                  ? formatWeight(post.catch.weight_kg, { precision: 1 })
                  : 'Catch logged'}{' '}
                · {post.catch.location_name || 'Unknown location'}
              </p>
            </div>
            <div className="text-2xl">🐟</div>
          </div>
        </div>
      )}

      <PostActions
        postId={post.id}
        likeCount={post.like_count}
        commentCount={post.comment_count}
        isLiked={post.is_liked_by_user}
      />
    </article>
  )
}
