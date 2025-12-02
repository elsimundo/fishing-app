import { useNavigate } from 'react-router-dom'
import type { PostWithUser } from '../../types'
import { PostHeader } from './PostHeader'
import { PostActions } from './PostActions'

interface FeedPostCardProps {
  post: PostWithUser
  showVisibility?: boolean
  onToggleVisibility?: (postId: string, nextIsPublic: boolean) => void
}

export function FeedPostCard({ post, showVisibility, onToggleVisibility }: FeedPostCardProps) {
  const navigate = useNavigate()

  const getCoverImage = () => {
    if (post.photo_url) return post.photo_url
    if (post.session?.cover_photo_url) return post.session.cover_photo_url
    if (post.session?.catches?.[0]?.photo_url) {
      return post.session.catches[0].photo_url
    }
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
    <article className="bg-white px-5 py-4">
      <PostHeader
        user={post.user}
        createdAt={post.created_at}
        onUserClick={() => navigate(`/profile/${post.user.id}`)}
      />

      {showVisibility ? (
        <div className="mt-1 flex justify-end">
          {onToggleVisibility ? (
            <button
              type="button"
              onClick={() => onToggleVisibility(post.id, !post.is_public)}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                post.is_public ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {post.is_public ? 'Public' : 'Private'}
            </button>
          ) : (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                post.is_public ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {post.is_public ? 'Public' : 'Private'}
            </span>
          )}
        </div>
      ) : null}

      {coverImage && (
        <div className="my-3 cursor-pointer" onClick={handleCardClick}>
          <img
            src={coverImage}
            alt="Post cover"
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
        </div>
      )}

      {post.caption && (
        <p className="text-[15px] leading-relaxed text-gray-900">{post.caption}</p>
      )}

      {post.type === 'catch' && post.catch && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4 sm:text-xs">
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-[10px] text-slate-500">Weight</p>
            <p className="text-sm font-semibold text-slate-900">
              {post.catch.weight_kg != null ? `${post.catch.weight_kg.toFixed(1)} kg` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-[10px] text-slate-500">Length</p>
            <p className="text-sm font-semibold text-slate-900">
              {post.catch.length_cm != null ? `${post.catch.length_cm.toFixed(1)} cm` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-[10px] text-slate-500">Bait</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{post.catch.bait || '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-[10px] text-slate-500">Rig</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{post.catch.rig || '—'}</p>
          </div>
        </div>
      )}

      {post.type === 'session' && post.session && (
        <div
          className="mt-3 cursor-pointer rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100"
          onClick={handleCardClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {post.session.title || 'Fishing Session'}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                {post.session.catches?.length || 0} catches ·{' '}
                {post.session.location_name || 'Unknown location'}
              </p>
            </div>
            <div className="text-2xl">🎣</div>
          </div>
        </div>
      )}

      {post.type === 'catch' && post.catch && (
        <div
          className="mt-3 cursor-pointer rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100"
          onClick={handleCardClick}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{post.catch.species}</p>
              <p className="mt-0.5 text-xs text-gray-600">
                {post.catch.weight_kg != null
                  ? `${post.catch.weight_kg.toFixed(1)} kg`
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