import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useFeed } from '../hooks/usePosts'
import { FeedPostCard } from '../components/feed/FeedPostCard'

export default function FeedView() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [activeTab, setActiveTab] = useState<'my' | 'friends' | 'global'>('friends')

  const {
    data: posts,
    isLoading,
    error,
  } = useFeed(userId)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-800" />
      </div>
    )
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    return (
      <div className="flex h-screen flex-col items-center justify-center p-5 text-center">
        <p className="mb-2 text-lg font-semibold text-gray-900">Unable to load feed</p>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-5 text-center">
        <div className="mb-4 text-5xl">🎣</div>
        <p className="mb-2 text-lg font-semibold text-gray-900">Your feed is empty</p>
        <p className="mb-6 text-sm text-gray-600">
          Follow other anglers to see their catches and sessions here!
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/explore'
          }}
          className="rounded-xl bg-navy-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-900"
        >
          Discover Anglers
        </button>
      </div>
    )
  }

  // Filter posts for the active tab. For now, Friends and Global share the same list;
  // My only shows posts authored by the current user.
  const filteredPosts =
    activeTab === 'my' && userId
      ? posts.filter((post) => post.user_id === userId)
      : posts

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 pt-4 pb-3">
        <h1 className="text-xl font-bold text-gray-900">Feed</h1>

        {/* Tabs: Me / Friends / Global */}
        <div className="mt-3 inline-flex rounded-full bg-gray-100 p-1 text-xs font-medium text-gray-600">
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`rounded-full px-3 py-1 transition-colors ${
              activeTab === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Me
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`rounded-full px-3 py-1 transition-colors ${
              activeTab === 'friends' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Friends
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`rounded-full px-3 py-1 transition-colors ${
              activeTab === 'global' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Global
          </button>
        </div>
      </div>

      {/* Feed Posts */}
      <div className="divide-y divide-gray-200">
        {filteredPosts.map((post) => (
          <FeedPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
