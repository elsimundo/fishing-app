import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  User,
  Waves,
  Store,
  Anchor,
  MapPin,
  BookOpen,
  Trophy,
  Loader2,
} from 'lucide-react'
import { useGlobalSearch, groupSearchResults, SEARCH_TYPE_CONFIG, type SearchResult, type SearchResultType } from '../../hooks/useGlobalSearch'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

const TYPE_ICONS: Record<SearchResultType, React.ElementType> = {
  user: User,
  lake: Waves,
  business: Store,
  charter: Anchor,
  mark: MapPin,
  species: BookOpen,
  challenge: Trophy,
}

const TYPE_COLORS: Record<SearchResultType, string> = {
  user: 'text-blue-500 bg-blue-500/10',
  lake: 'text-cyan-500 bg-cyan-500/10',
  business: 'text-orange-500 bg-orange-500/10',
  charter: 'text-indigo-500 bg-indigo-500/10',
  mark: 'text-red-500 bg-red-500/10',
  species: 'text-green-500 bg-green-500/10',
  challenge: 'text-amber-500 bg-amber-500/10',
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { data: results, isLoading } = useGlobalSearch(query)
  const grouped = results ? groupSearchResults(results) : {}

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Reset query when closed
  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      const route = SEARCH_TYPE_CONFIG[result.type].route(result.id)
      navigate(route)
      onClose()
    },
    [navigate, onClose]
  )

  if (!isOpen) return null

  const hasResults = results && results.length > 0
  const showEmptyState = query.length >= 2 && !isLoading && !hasResults

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={20} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search users, lakes, businesses, species..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Loading */}
          {isLoading && query.length >= 2 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty state */}
          {showEmptyState && (
            <div className="py-8 text-center">
              <Search size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
            </div>
          )}

          {/* Prompt to type more */}
          {query.length > 0 && query.length < 2 && !isLoading && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
            </div>
          )}

          {/* Initial state */}
          {query.length === 0 && (
            <div className="py-8 text-center">
              <Search size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Search for anglers, lakes, businesses & more</p>
            </div>
          )}

          {/* Grouped results */}
          {hasResults && !isLoading && (
            <div className="py-2">
              {(Object.keys(grouped) as SearchResultType[]).map((type) => {
                const items = grouped[type]
                if (!items || items.length === 0) return null
                const config = SEARCH_TYPE_CONFIG[type]
                const Icon = TYPE_ICONS[type]
                const colorClass = TYPE_COLORS[type]

                return (
                  <div key={type} className="mb-2">
                    {/* Section header */}
                    <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {config.label}
                    </div>

                    {/* Items */}
                    {items.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        {/* Icon or avatar */}
                        {result.image_url ? (
                          <img
                            src={result.image_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                            <Icon size={16} />
                          </div>
                        )}

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
