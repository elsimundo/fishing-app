import { useState, useRef, useEffect } from 'react'
import { Search, X, MapPin, Fish, Store, Anchor, Users, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface SearchResult {
  id: string
  type: 'lake' | 'shop' | 'charter' | 'club'
  name: string
  lat: number
  lng: number
  region?: string
}

interface ExploreSearchProps {
  onSelectResult: (result: SearchResult) => void
}

export function ExploreSearch({ onSelectResult }: ExploreSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      
      try {
        const searchResults: SearchResult[] = []
        
        // Search lakes
        const { data: lakes } = await supabase
          .from('lakes')
          .select('id, name, latitude, longitude, region')
          .ilike('name', `%${query}%`)
          .limit(5)
        
        if (lakes) {
          for (const lake of lakes) {
            searchResults.push({
              id: `lake-${lake.id}`,
              type: 'lake',
              name: lake.name,
              lat: lake.latitude,
              lng: lake.longitude,
              region: lake.region || undefined,
            })
          }
        }

        // Search businesses (tackle shops, charters, clubs)
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id, name, type, lat, lng, address')
          .ilike('name', `%${query}%`)
          .in('type', ['tackle_shop', 'charter', 'club'])
          .limit(10)
        
        if (businesses) {
          for (const biz of businesses) {
            searchResults.push({
              id: biz.id,
              type: biz.type === 'tackle_shop' ? 'shop' : biz.type as 'charter' | 'club',
              name: biz.name,
              lat: biz.lat,
              lng: biz.lng,
              region: biz.address || undefined,
            })
          }
        }

        setResults(searchResults)
      } catch (error) {
        console.error('[ExploreSearch] Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (result: SearchResult) => {
    onSelectResult(result)
    setQuery('')
    setIsOpen(false)
    setResults([])
  }

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'lake': return <Fish size={14} className="text-sky-600" />
      case 'shop': return <Store size={14} className="text-orange-600" />
      case 'charter': return <Anchor size={14} className="text-rose-600" />
      case 'club': return <Users size={14} className="text-violet-600" />
    }
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'lake': return 'Lake'
      case 'shop': return 'Tackle Shop'
      case 'charter': return 'Charter'
      case 'club': return 'Club'
    }
  }

  const getTypeBgColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'lake': return 'bg-sky-100 dark:bg-sky-900/30'
      case 'shop': return 'bg-orange-100 dark:bg-orange-900/30'
      case 'charter': return 'bg-rose-100 dark:bg-rose-900/30'
      case 'club': return 'bg-violet-100 dark:bg-violet-900/30'
    }
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search lakes, shops, charters..."
          className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-8 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center">
              <MapPin size={24} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="py-1">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {type === 'lake' ? 'Lakes' : type === 'shop' ? 'Tackle Shops' : type === 'charter' ? 'Charters' : 'Clubs'}
                  </div>
                  {items.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelect(result)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getTypeBgColor(result.type)}`}>
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{result.name}</p>
                        {result.region && (
                          <p className="text-xs text-muted-foreground truncate">{result.region}</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground ${getTypeBgColor(result.type)}`}>
                        {getTypeLabel(result.type)}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
