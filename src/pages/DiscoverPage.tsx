import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { UserSearchResults } from '../components/discover/UserSearchResults'
import { SuggestedUsers } from '../components/discover/SuggestedUsers'
import { PopularAnglers } from '../components/discover/PopularAnglers'

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const isSearching = debouncedQuery.trim().length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="px-5 py-4">
          <h1 className="mb-4 text-xl font-bold text-gray-900">Discover</h1>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anglers..."
              className="w-full rounded-xl border-2 border-gray-200 px-12 py-3 text-sm focus:border-navy-800 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pb-20">
        {isSearching ? (
          <UserSearchResults query={debouncedQuery} />
        ) : (
          <>
            <SuggestedUsers />
            <PopularAnglers />
          </>
        )}
      </div>
    </div>
  )
}
