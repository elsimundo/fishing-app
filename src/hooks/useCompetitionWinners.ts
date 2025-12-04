import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

interface CompetitionWinner {
  id: string
  competition_id: string
  user_id: string
  category: string
  catch_id: string | null
  notes: string | null
  declared_at: string
  user: {
    username: string
    avatar_url: string | null
  }
}

/**
 * Get winners for a competition
 */
export function useCompetitionWinners(competitionId: string) {
  return useQuery({
    queryKey: ['competition-winners', competitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competition_winners')
        .select(`
          *,
          user:profiles!competition_winners_user_id_fkey(
            username,
            avatar_url
          )
        `)
        .eq('competition_id', competitionId)
        .order('declared_at', { ascending: false })

      if (error) throw error
      return data as CompetitionWinner[]
    },
    enabled: !!competitionId,
  })
}

/**
 * Declare a winner
 */
export function useDeclareWinner() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      competitionId,
      winnerUserId,
      category,
      catchId,
      notes,
    }: {
      competitionId: string
      winnerUserId: string
      category: string
      catchId?: string
      notes?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('declare_competition_winner', {
        p_competition_id: competitionId,
        p_organizer_id: user.id,
        p_winner_user_id: winnerUserId,
        p_category: category,
        p_catch_id: catchId || null,
        p_notes: notes || null,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['competition-winners', variables.competitionId],
      })
      toast.success('Winner declared!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to declare winner')
    },
  })
}

/**
 * Remove a winner declaration
 */
export function useRemoveWinner() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      winnerId,
      competitionId,
    }: {
      winnerId: string
      competitionId: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('remove_competition_winner', {
        p_winner_id: winnerId,
        p_organizer_id: user.id,
      })

      if (error) throw error
      return { winnerId, competitionId }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['competition-winners', variables.competitionId],
      })
      toast.success('Winner removed')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove winner')
    },
  })
}
