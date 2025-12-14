import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Lake } from '../types'

export interface ManagedLake {
  lake: Lake
  role: 'owner' | 'manager' | 'bailiff'
}

/**
 * Fetch lakes where the current user is owner or team member (manager/bailiff)
 */
export function useMyManagedLakes() {
  const { user } = useAuth()

  return useQuery<ManagedLake[]>({
    queryKey: ['my-managed-lakes', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Get lakes where user is owner
      const { data: ownedLakes } = await supabase
        .from('lakes')
        .select('*')
        .eq('claimed_by', user.id)

      // Get lakes where user is team member
      const { data: teamMemberships } = await supabase
        .from('lake_team')
        .select('lake_id, role')
        .eq('user_id', user.id)

      // Fetch those lakes
      const teamLakeIds = (teamMemberships || []).map((t) => t.lake_id)
      let teamLakes: Lake[] = []
      
      if (teamLakeIds.length > 0) {
        const { data } = await supabase
          .from('lakes')
          .select('*')
          .in('id', teamLakeIds)
        teamLakes = (data || []) as Lake[]
      }

      // Build role map for team lakes
      const roleMap: Record<string, 'manager' | 'bailiff'> = {}
      ;(teamMemberships || []).forEach((t) => {
        roleMap[t.lake_id] = t.role as 'manager' | 'bailiff'
      })

      // Combine and dedupe (owner takes precedence)
      const ownedIds = new Set((ownedLakes || []).map((l) => l.id))
      
      const result: ManagedLake[] = [
        // Owned lakes first
        ...(ownedLakes || []).map((lake) => ({
          lake: lake as Lake,
          role: 'owner' as const,
        })),
        // Team lakes (exclude if already owner)
        ...teamLakes
          .filter((lake) => !ownedIds.has(lake.id))
          .map((lake) => ({
            lake,
            role: roleMap[lake.id] || 'bailiff',
          })),
      ]

      return result
    },
    enabled: !!user,
  })
}
