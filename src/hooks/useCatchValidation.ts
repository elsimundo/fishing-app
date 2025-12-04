import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

/**
 * Hook to approve a catch
 */
export function useApproveCatch() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (catchId: string) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('approve_catch', {
        p_catch_id: catchId,
        p_organizer_id: user.id,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['competition-pending-catches'] })
      queryClient.invalidateQueries({ queryKey: ['competition-leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['my-competition-catches'] })

      toast.success('Catch approved!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve catch')
    },
  })
}

/**
 * Hook to reject a catch
 */
export function useRejectCatch() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ catchId, reason }: { catchId: string; reason: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('reject_catch', {
        p_catch_id: catchId,
        p_organizer_id: user.id,
        p_reason: reason,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-pending-catches'] })
      queryClient.invalidateQueries({ queryKey: ['competition-leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['my-competition-catches'] })

      toast.success('Catch rejected')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject catch')
    },
  })
}
