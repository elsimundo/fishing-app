import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface LakeCatchRecord {
  id: string
  species: string
  weight_kg: number | null
  length_cm: number | null
  caught_at: string
  photo_url: string | null
  user: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface LakeTopAngler {
  user_id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  total_catches: number
  total_sessions: number
}

export interface LakeStats {
  biggestCatch: LakeCatchRecord | null
  topSpecies: { species: string; count: number }[]
  topAnglers: LakeTopAngler[]
  recentCatches: LakeCatchRecord[]
  totalSessions: number
  totalCatches: number
  uniqueAnglers: number
}

/**
 * Fetch statistics and records for a lake
 */
export function useLakeStats(lakeId: string | undefined) {
  return useQuery<LakeStats>({
    queryKey: ['lake-stats', lakeId],
    queryFn: async () => {
      if (!lakeId) throw new Error('No lake ID')

      // Get all sessions at this lake
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, user_id')
        .eq('lake_id', lakeId)

      const sessionIds = sessions?.map((s) => s.id) || []
      const uniqueAnglerIds = [...new Set(sessions?.map((s) => s.user_id) || [])]

      if (sessionIds.length === 0) {
        return {
          biggestCatch: null,
          topSpecies: [],
          topAnglers: [],
          recentCatches: [],
          totalSessions: 0,
          totalCatches: 0,
          uniqueAnglers: 0,
        }
      }

      // Get all catches from those sessions
      const { data: catches } = await supabase
        .from('catches')
        .select(`
          id,
          species,
          weight_kg,
          length_cm,
          caught_at,
          photo_url,
          user_id,
          user:profiles!catches_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .in('session_id', sessionIds)
        .order('caught_at', { ascending: false })

      const allCatches = (catches || []).map((c) => ({
        ...c,
        user: Array.isArray(c.user) ? c.user[0] : c.user,
      })) as (LakeCatchRecord & { user_id: string })[]

      // Biggest catch (by weight)
      const catchesWithWeight = allCatches.filter((c) => c.weight_kg && c.weight_kg > 0)
      const biggestCatch = catchesWithWeight.length > 0
        ? catchesWithWeight.reduce((max, c) => (c.weight_kg! > (max.weight_kg || 0) ? c : max))
        : null

      // Top species
      const speciesCount: Record<string, number> = {}
      allCatches.forEach((c) => {
        speciesCount[c.species] = (speciesCount[c.species] || 0) + 1
      })
      const topSpecies = Object.entries(speciesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([species, count]) => ({ species, count }))

      // Top anglers (by catch count)
      const anglerCatches: Record<string, number> = {}
      const anglerSessions: Record<string, Set<string>> = {}
      
      allCatches.forEach((c) => {
        anglerCatches[c.user_id] = (anglerCatches[c.user_id] || 0) + 1
      })
      
      sessions?.forEach((s) => {
        if (!anglerSessions[s.user_id]) {
          anglerSessions[s.user_id] = new Set()
        }
        anglerSessions[s.user_id].add(s.id)
      })

      // Get profile info for top anglers
      const topAnglerIds = Object.entries(anglerCatches)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId]) => userId)

      const { data: anglerProfiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', topAnglerIds)

      const profileMap = new Map(anglerProfiles?.map((p) => [p.id, p]) || [])

      const topAnglers: LakeTopAngler[] = topAnglerIds.map((userId) => {
        const profile = profileMap.get(userId)
        return {
          user_id: userId,
          username: profile?.username || null,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          total_catches: anglerCatches[userId] || 0,
          total_sessions: anglerSessions[userId]?.size || 0,
        }
      })

      // Recent catches (last 5)
      const recentCatches = allCatches.slice(0, 5)

      return {
        biggestCatch,
        topSpecies,
        topAnglers,
        recentCatches,
        totalSessions: sessions?.length || 0,
        totalCatches: allCatches.length,
        uniqueAnglers: uniqueAnglerIds.length,
      }
    },
    enabled: !!lakeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
