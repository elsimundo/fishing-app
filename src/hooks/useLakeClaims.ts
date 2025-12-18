import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { LakeClaimStatus, LakeClaimRole } from '../types'

export interface MyLakeClaim {
  id: string
  lake_id: string
  user_id: string
  status: LakeClaimStatus
  role: LakeClaimRole
  business_name?: string
  created_at: string
  reviewed_at?: string
  lake: {
    id: string
    name: string
    latitude: number
    longitude: number
    region?: string
  }
}

/**
 * Fetch current user's lake claims with lake info
 */
export function useMyLakeClaims() {
  const { user } = useAuth()

  return useQuery<MyLakeClaim[]>({
    queryKey: ['my-lake-claims', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('lake_claims')
        .select(`
          id, lake_id, user_id, status, role, business_name, created_at, reviewed_at,
          lake:lakes(id, name, latitude, longitude, region)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Supabase returns joined tables as arrays, flatten them
      return (data ?? []).map((claim: any) => ({
        ...claim,
        lake: Array.isArray(claim.lake) ? claim.lake[0] : claim.lake,
      })) as MyLakeClaim[]
    },
    enabled: Boolean(user?.id),
  })
}

/**
 * Check if user has a pending claim for a specific lake
 */
export function useHasPendingClaim(lakeId: string | undefined) {
  const { user } = useAuth()

  return useQuery<boolean>({
    queryKey: ['has-pending-claim', lakeId, user?.id],
    queryFn: async () => {
      if (!user || !lakeId) return false

      const { data, error } = await supabase
        .from('lake_claims')
        .select('id')
        .eq('lake_id', lakeId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    },
    enabled: Boolean(user?.id) && Boolean(lakeId),
  })
}
