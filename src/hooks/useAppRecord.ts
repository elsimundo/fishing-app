import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AppRecord {
  weightKg: number
  lengthCm: number | null
  odId: string
  userId: string
  username: string | null
  avatarUrl: string | null
  caughtAt: string
}

// Query the app record (heaviest catch) for a species
export function useAppRecord(speciesName: string | null | undefined) {
  return useQuery({
    queryKey: ['app-record', speciesName],
    queryFn: async (): Promise<AppRecord | null> => {
      if (!speciesName) return null

      const { data, error } = await supabase
        .from('catches')
        .select(`
          id,
          weight_kg,
          length_cm,
          user_id,
          caught_at,
          profiles!catches_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq('species', speciesName)
        .not('weight_kg', 'is', null)
        .order('weight_kg', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching app record:', error)
        return null
      }

      if (!data || !data.weight_kg) return null

      const profile = data.profiles as unknown as { username: string | null; avatar_url: string | null } | null

      return {
        weightKg: data.weight_kg,
        lengthCm: data.length_cm,
        odId: data.id,
        userId: data.user_id,
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        caughtAt: data.caught_at,
      }
    },
    enabled: !!speciesName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Query total catch count for a species across the app
export function useSpeciesCatchCount(speciesName: string | null | undefined) {
  return useQuery({
    queryKey: ['species-catch-count', speciesName],
    queryFn: async (): Promise<number> => {
      if (!speciesName) return 0

      const { count, error } = await supabase
        .from('catches')
        .select('*', { count: 'exact', head: true })
        .eq('species', speciesName)

      if (error) {
        console.error('Error fetching species catch count:', error)
        return 0
      }

      return count ?? 0
    },
    enabled: !!speciesName,
    staleTime: 5 * 60 * 1000,
  })
}

// Query unique anglers who have caught this species
export function useSpeciesAnglerCount(speciesName: string | null | undefined) {
  return useQuery({
    queryKey: ['species-angler-count', speciesName],
    queryFn: async (): Promise<number> => {
      if (!speciesName) return 0

      const { data, error } = await supabase
        .from('catches')
        .select('user_id')
        .eq('species', speciesName)

      if (error) {
        console.error('Error fetching species angler count:', error)
        return 0
      }

      // Count unique user IDs
      const uniqueUsers = new Set(data?.map(c => c.user_id) ?? [])
      return uniqueUsers.size
    },
    enabled: !!speciesName,
    staleTime: 5 * 60 * 1000,
  })
}
