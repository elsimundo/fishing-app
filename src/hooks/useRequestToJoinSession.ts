import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface RequestToJoinParams {
  session_id: string
}

async function requestToJoinSession({ session_id }: RequestToJoinParams) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in')

  // Check if already a participant
  const { data: existing } = await supabase
    .from('session_participants')
    .select('id, status')
    .eq('session_id', session_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'active') {
      throw new Error('You are already a participant in this session')
    }
    if (existing.status === 'pending') {
      throw new Error('You already have a pending request for this session')
    }
  }

  // Create pending participant request
  const { data, error } = await supabase
    .from('session_participants')
    .insert({
      session_id,
      user_id: user.id,
      role: 'viewer',
      status: 'pending',
      joined_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  // TODO: Create notification for session owner about join request
  // This would require a notifications table

  return data
}

export function useRequestToJoinSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: requestToJoinSession,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-participants', variables.session_id] })
      queryClient.invalidateQueries({ queryKey: ['my-session-role', variables.session_id] })
    },
  })
}
