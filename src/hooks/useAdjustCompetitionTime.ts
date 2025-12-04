import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

export function useAdjustCompetitionTime() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      competitionId,
      newEndsAt,
      reason,
    }: {
      competitionId: string
      newEndsAt: string // ISO timestamp
      reason?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('adjust_competition_time', {
        p_competition_id: competitionId,
        p_organizer_id: user.id,
        p_new_ends_at: newEndsAt,
        p_reason: reason || null,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['competition', variables.competitionId],
      })
      toast.success('Competition time adjusted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust time')
    },
  })
}
