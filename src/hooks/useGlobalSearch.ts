import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useDeferredValue } from 'react'

export type SearchResultType = 'user' | 'lake' | 'business' | 'charter' | 'mark' | 'species' | 'challenge'

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
}

export function useGlobalSearch(query: string, limit = 20) {
  const deferredQuery = useDeferredValue(query.trim())

  return useQuery({
    queryKey: ['global-search', deferredQuery, limit],
    queryFn: async () => {
      if (deferredQuery.length < 2) return []

      const { data, error } = await supabase.rpc('global_search', {
        p_query: deferredQuery,
        p_limit: limit,
      })

      if (error) throw error
      return (data || []) as SearchResult[]
    },
    enabled: deferredQuery.length >= 2,
    staleTime: 30 * 1000,
  })
}

export interface GroupedSearchResults {
  user?: SearchResult[]
  lake?: SearchResult[]
  business?: SearchResult[]
  charter?: SearchResult[]
  mark?: SearchResult[]
  species?: SearchResult[]
  challenge?: SearchResult[]
}

export function groupSearchResults(results: SearchResult[]): GroupedSearchResults {
  const groups: GroupedSearchResults = {}
  for (const result of results) {
    if (!groups[result.type]) groups[result.type] = []
    groups[result.type]!.push(result)
  }
  return groups
}

export const SEARCH_TYPE_CONFIG: Record<SearchResultType, { label: string; icon: string; route: (id: string) => string }> = {
  user: { label: 'Users', icon: 'User', route: (id) => `/profile/${id}` },
  lake: { label: 'Lakes', icon: 'Waves', route: (id) => `/lakes/${id}` },
  business: { label: 'Businesses', icon: 'Store', route: (id) => `/explore?business=${id}` },
  charter: { label: 'Charters', icon: 'Anchor', route: (id) => `/explore?charter=${id}` },
  mark: { label: 'Fishing Marks', icon: 'MapPin', route: (id) => `/marks/${id}` },
  species: { label: 'Species', icon: 'Fish', route: (id) => `/species/${id}` },
  challenge: { label: 'Challenges', icon: 'Trophy', route: (slug) => `/challenges/${slug}` },
}
