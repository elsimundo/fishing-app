import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface MyBusinessClaim {
  id: string
  business_id: string
  user_id: string
  relationship: string
  proof_notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  business: {
    id: string
    name: string
    type: string
    address: string | null
  } | null
}

export interface MyBusinessSubmission {
  id: string
  name: string
  type: string
  address: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  created_at: string
}

/**
 * Fetch current user's business claims (for existing OSM businesses)
 */
export function useMyBusinessClaims() {
  const { user } = useAuth()

  return useQuery<MyBusinessClaim[]>({
    queryKey: ['my-business-claims', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('business_claims')
        .select(`
          id, business_id, user_id, relationship, proof_notes, status, created_at, reviewed_at,
          business:businesses(id, name, type, address)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Supabase returns joined tables as arrays, flatten them
      return (data ?? []).map((claim: any) => ({
        ...claim,
        business: Array.isArray(claim.business) ? claim.business[0] : claim.business,
      })) as MyBusinessClaim[]
    },
    enabled: Boolean(user?.id),
  })
}

/**
 * Fetch current user's business submissions (user-created businesses)
 */
export function useMyBusinessSubmissions() {
  const { user } = useAuth()

  return useQuery<MyBusinessSubmission[]>({
    queryKey: ['my-business-submissions', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, type, address, status, created_at')
        .eq('claimed_by', user.id)
        .eq('source', 'user_submitted')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as MyBusinessSubmission[]
    },
    enabled: Boolean(user?.id),
  })
}

/**
 * Check if user has a pending claim for a specific business
 */
export function useHasPendingBusinessClaim(businessId: string | undefined) {
  const { user } = useAuth()

  return useQuery<boolean>({
    queryKey: ['has-pending-business-claim', businessId, user?.id],
    queryFn: async () => {
      if (!user || !businessId) return false

      const { data, error } = await supabase
        .from('business_claims')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    },
    enabled: Boolean(user?.id) && Boolean(businessId),
  })
}
