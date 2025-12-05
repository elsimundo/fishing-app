import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useMarkSessionViewed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.rpc('mark_session_viewed', {
        p_session_id: sessionId,
      })

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate active sessions query so banner disappears
      queryClient.invalidateQueries({ queryKey: ['sessions', 'active-all'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
