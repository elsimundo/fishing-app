import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

interface PendingCatch {
  id: string
  species: string
  weight_kg: number
  length_cm: number | null
  photo_url: string | null
  created_at: string
  validation_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  user: {
    id: string
    username: string
    avatar_url: string | null
  }
}

/**
 * Get pending catches for competition (organizer view)
 */
export function useCompetitionPendingCatches(competitionId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['competition-pending-catches', competitionId],
    queryFn: async () => {
      // Get competition details
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .select('session_id, created_by')
        .eq('id', competitionId)
        .single()

      if (compError) throw compError
      if (!competition) throw new Error('Competition not found')

      // Verify user is organizer
      if (competition.created_by !== user?.id) {
        throw new Error('Only organizer can view pending catches')
      }

      // Get pending catches
      const { data: catches, error } = await supabase
        .from('catches')
        .select(`
          *,
          user:profiles!catches_user_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('session_id', competition.session_id)
        .eq('validation_status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return catches as PendingCatch[]
    },
    enabled: !!user && !!competitionId,
  })
}
