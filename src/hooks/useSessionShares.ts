import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type SessionShare = {
  id: string
  session_id: string
  shared_with_user_id: string
  can_view_exact_location: boolean
  created_at: string
}

async function fetchSessionShares(sessionId: string): Promise<SessionShare[]> {
  const { data, error } = await supabase
    .from('session_shares')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as SessionShare[]
}

export function useSessionShares(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session_shares', sessionId],
    queryFn: () => fetchSessionShares(sessionId as string),
    enabled: Boolean(sessionId),
  })
}

export function useAddSessionShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      session_id: string
      shared_with_user_id: string
      can_view_exact_location: boolean
    }) => {
      const { data, error } = await supabase
        .from('session_shares')
        .insert(input)
        .select('*')
        .single()

      if (error) throw new Error(error.message)
      return data as SessionShare
    },
    onSuccess: (share) => {
      void queryClient.invalidateQueries({ queryKey: ['session_shares', share.session_id] })
    },
  })
}

export function useDeleteSessionShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; session_id: string }) => {
      const { error } = await supabase.from('session_shares').delete().eq('id', input.id)
      if (error) throw new Error(error.message)
      return input
    },
    onSuccess: (input) => {
      void queryClient.invalidateQueries({ queryKey: ['session_shares', input.session_id] })
    },
  })
}
