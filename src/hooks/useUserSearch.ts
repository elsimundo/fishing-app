import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export function useUserSearch(query: string) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: ['user-search', trimmed],
    enabled: trimmed.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, location')
        .or(`username.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
        .limit(20)

      if (error) throw new Error(error.message)
      return (data ?? []) as Profile[]
    },
  })
}
