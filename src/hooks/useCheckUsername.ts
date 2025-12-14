import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { normalizeUsername } from '../utils/validation'

export type UsernameCheckReason = 'too-short' | 'taken' | 'reserved' | 'available'

export function useCheckUsername(username: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['check-username', normalizeUsername(username)],
    queryFn: async () => {
      if (!username || username.trim().length < 3) {
        return { available: false, reason: 'too-short' as UsernameCheckReason }
      }

      const normalized = normalizeUsername(username)

      // Check if username is reserved (for brands, influencers, etc.)
      const { data: reserved } = await supabase
        .from('reserved_usernames')
        .select('username, claimed_by')
        .ilike('username', normalized)
        .maybeSingle()

      if (reserved && !reserved.claimed_by) {
        return { available: false, reason: 'reserved' as UsernameCheckReason }
      }

      // Check if username is already taken by another user
      const { data: existing, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', normalized)
        .maybeSingle()

      if (error) throw error

      return {
        available: !existing,
        reason: existing ? ('taken' as UsernameCheckReason) : ('available' as UsernameCheckReason),
      }
    },
    enabled: enabled && username.trim().length >= 3,
    staleTime: 30000,
    retry: 1,
  })
}
