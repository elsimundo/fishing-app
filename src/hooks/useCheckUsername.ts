import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { normalizeUsername } from '../utils/validation'

export function useCheckUsername(username: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['check-username', normalizeUsername(username)],
    queryFn: async () => {
      if (!username || username.trim().length < 3) {
        return { available: false, reason: 'too-short' as const }
      }

      const normalized = normalizeUsername(username)

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', normalized)
        .maybeSingle()

      if (error) throw error

      return {
        available: !data,
        reason: data ? ('taken' as const) : ('available' as const),
      }
    },
    enabled: enabled && username.trim().length >= 3,
    staleTime: 30000,
    retry: 1,
  })
}
