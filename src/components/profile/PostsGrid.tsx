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
    <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
      {posts.map((post) => {
        const enriched = post as any
        const imageUrl = post.photo_url || enriched.session?.cover_photo_url || null

        return (
          <button
            key={post.id}
            type="button"
            onClick={() => {
              if (post.session_id) {
                navigate(`/sessions/${post.session_id}`)
              }
            }}
            className="group relative aspect-square overflow-hidden bg-gray-200"
         >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Post"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                <span className="text-4xl">🎣</span>
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center gap-6 bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex items-center gap-1">
                <span>❤️</span>
                <span className="font-semibold">{(post as any).like_count ?? 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>💬</span>
                <span className="font-semibold">{(post as any).comment_count ?? 0}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
