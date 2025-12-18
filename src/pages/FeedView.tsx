import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { useAuth } from '../hooks/useAuth'
import { useFeed, useGlobalFeed } from '../hooks/usePosts'
import { FeedPostCard } from '../components/feed/FeedPostCard'
import { PostSkeleton } from '../components/feed/PostSkeleton'
import { ErrorState } from '../components/ui/ErrorState'

export default function FeedView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.id ?? ''
  const [activeTab, setActiveTab] = useState<'my' | 'friends' | 'global'>('friends')
  const [pageSize, setPageSize] = useState(20)

  const {
    data: friendsPosts,
    isLoading: isLoadingFriends,
    error: friendsError,
    refetch: refetchFriends,
  } = useFeed(userId, pageSize, 0)

  const {
    data: globalPosts,
    isLoading: isLoadingGlobal,
    error: globalError,
    refetch: refetchGlobal,
  } = useGlobalFeed(userId, pageSize, 0)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const activePosts = activeTab === 'global' ? globalPosts : friendsPosts
  const isLoading = activeTab === 'global' ? isLoadingGlobal : isLoadingFriends
  const error = activeTab === 'global' ? globalError : friendsError
  const refetch = activeTab === 'global' ? refetchGlobal : refetchFriends

  if (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    return <ErrorState title="Unable to load feed" message={message} onRetry={refetch} />
  }

  if (!activePosts || activePosts.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-5 text-center bg-background">
        <div className="mb-4 text-5xl">🎣</div>
        <p className="mb-2 text-lg font-semibold text-foreground">Your feed is empty</p>
        <p className="mb-6 text-sm text-muted-foreground">
          Follow other anglers to see their catches and sessions here!
        </p>
        <button
          type="button"
          onClick={() => navigate('/discover')}
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
      ? activePosts.filter((post) => post.user_id === userId)
      : activePosts

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-5 pt-4 pb-3">
        <h1 className="text-xl font-bold text-foreground">Feed</h1>

        {/* Tabs: Me / Friends / Global */}
        <div className="mt-3 inline-flex rounded-full bg-card p-1 text-xs font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`rounded-full px-3 py-1 transition-colors ${
              activeTab === 'my' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Me
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`rounded-full px-3 py-1 transition-colors ${
              activeTab === 'friends' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Friends
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`rounded-full px-3 py-1 transition-colors ${
              activeTab === 'global' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Global
          </button>
        </div>
      </div>

      {/* Feed Posts with pull-to-refresh */}
      <PullToRefresh onRefresh={refetch}>
        <div className="divide-y divide-border">
          {isLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : (
            filteredPosts.map((post) => <FeedPostCard key={post.id} post={post} />)
          )}
        </div>

        {/* Load more posts */}
        {!isLoading && activePosts.length >= pageSize && (
          <div className="border-t border-border bg-background px-5 py-4 text-center">
            <button
              type="button"
              onClick={() => setPageSize((prev) => prev + 10)}
              className="text-sm font-semibold text-primary hover:text-primary/80"
            >
              Load more posts
            </button>
          </div>
        )}

        {!isLoading && activePosts.length > 0 && activePosts.length < pageSize && (
          <div className="border-t border-border bg-background px-5 py-4 text-center text-xs text-muted-foreground">
            You're all caught up! 🎣
          </div>
        )}
      </PullToRefresh>
    </div>
  )
}
