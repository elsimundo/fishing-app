import { useNavigate } from 'react-router-dom'
import type { Post } from '../../types'

interface PostsGridProps {
  posts: Post[]
}

export function PostsGrid({ posts }: PostsGridProps) {
  const navigate = useNavigate()

  if (!posts || posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mb-3 text-5xl">📸</div>
        <p className="mb-1 text-base font-semibold text-gray-900">No posts yet</p>
        <p className="text-sm text-gray-600">Share your first fishing session!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {posts.map((post) => {
        const enriched = post as any
        const imageUrl =
          post.photo_url || enriched.session?.cover_photo_url || enriched.catch?.photo_url || null
        const likeCount = (post as any).like_count ?? 0
        const commentCount = (post as any).comment_count ?? 0

        let typeLabel = 'Post'
        if (post.type === 'session') typeLabel = 'Session'
        if (post.type === 'catch') typeLabel = 'Catch'
        if (post.type === 'photo') typeLabel = 'Photo'

        const caption = (post as any).caption as string | undefined
        const captionSnippet = caption ? (caption.length > 60 ? `${caption.slice(0, 57)}…` : caption) : ''

        return (
          <button
            key={post.id}
            type="button"
            onClick={() => {
              if (post.session_id) {
                navigate(`/sessions/${post.session_id}`)
              }
            }}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-gray-100 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Post"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                <span className="text-4xl">🎣</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex items-center justify-between text-[10px] font-medium">
                <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">{typeLabel}</span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span>❤️</span>
                    <span className="font-semibold">{likeCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span>💬</span>
                    <span className="font-semibold">{commentCount}</span>
                  </span>
                </div>
              </div>

              {captionSnippet ? (
                <p className="line-clamp-2 text-left text-[11px] leading-snug text-slate-100">
                  {captionSnippet}
                </p>
              ) : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}
