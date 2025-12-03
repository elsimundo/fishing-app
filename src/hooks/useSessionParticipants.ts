import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ParticipantRole, SessionParticipant } from '../types'

async function fetchSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
  const { data, error } = await supabase
    .from('session_participants')
    .select('*, user:profiles(*)')
    .eq('session_id', sessionId)
    .order('invited_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as SessionParticipant[]
}

export function useSessionParticipants(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session_participants', sessionId],
    queryFn: () => fetchSessionParticipants(sessionId as string),
    enabled: Boolean(sessionId),
  })
}

async function fetchMySessionRole(sessionId: string): Promise<ParticipantRole | null> {
  const userRes = await supabase.auth.getUser()
  const userId = userRes.data.user?.id

  if (!userId) return null

  const { data, error } = await supabase
    .from('session_participants')
    .select('role, status')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .in('status', ['pending', 'active'])
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message)
  }

  if (!data) return null
  return data.role as ParticipantRole
}

export function useMySessionRole(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session_my_role', sessionId],
    queryFn: () => fetchMySessionRole(sessionId as string),
    enabled: Boolean(sessionId),
  })
}

export function useInviteToSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { session_id: string; user_id: string; role: ParticipantRole }) => {
      const { data, error } = await supabase
        .from('session_participants')
        .insert({
          session_id: input.session_id,
          user_id: input.user_id,
          role: input.role,
        })
        .select('*, user:profiles(*)')
        .single()

      if (error) throw new Error(error.message)
      return data as SessionParticipant
    },
    onSuccess: (participant) => {
      void queryClient.invalidateQueries({
        queryKey: ['session_participants', participant.session_id],
      })
      void queryClient.invalidateQueries({
        queryKey: ['session_my_role', participant.session_id],
      })
    },
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { participant_id: string; session_id: string }) => {
      const { data, error } = await supabase
        .from('session_participants')
        .update({ status: 'active', joined_at: new Date().toISOString() })
        .eq('id', input.participant_id)
        .select('*, user:profiles(*)')
        .single()

      if (error) throw new Error(error.message)
      return data as SessionParticipant
    },
    onSuccess: (participant) => {
      void queryClient.invalidateQueries({
        queryKey: ['session_participants', participant.session_id],
      })
      void queryClient.invalidateQueries({
        queryKey: ['session_my_role', participant.session_id],
      })
    },
  })
}

export function useLeaveSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { participant_id: string; session_id: string }) => {
      const { data, error } = await supabase
        .from('session_participants')
        .update({ status: 'left', left_at: new Date().toISOString() })
        .eq('id', input.participant_id)
        .select('*, user:profiles(*)')
        .single()

      if (error) throw new Error(error.message)
      return data as SessionParticipant
    },
    onSuccess: (participant) => {
      void queryClient.invalidateQueries({
        queryKey: ['session_participants', participant.session_id],
      })
      void queryClient.invalidateQueries({
        queryKey: ['session_my_role', participant.session_id],
      })
    },
  })
}

export function useChangeParticipantRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      participant_id: string
      session_id: string
      role: ParticipantRole
    }) => {
      const { data, error } = await supabase
        .from('session_participants')
        .update({ role: input.role })
        .eq('id', input.participant_id)
        .select('*, user:profiles(*)')
        .single()

      if (error) throw new Error(error.message)
      return data as SessionParticipant
    },
    onSuccess: (participant) => {
      void queryClient.invalidateQueries({
        queryKey: ['session_participants', participant.session_id],
      })
      void queryClient.invalidateQueries({
        queryKey: ['session_my_role', participant.session_id],
      })
    },
  })
}

export function useRemoveParticipant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { participant_id: string; session_id: string }) => {
      const { data, error } = await supabase
        .from('session_participants')
        .update({ status: 'removed', left_at: new Date().toISOString() })
        .eq('id', input.participant_id)
        .select('*, user:profiles(*)')
        .single()

      if (error) throw new Error(error.message)
      return data as SessionParticipant
    },
    onSuccess: (participant) => {
      void queryClient.invalidateQueries({
        queryKey: ['session_participants', participant.session_id],
      })
      void queryClient.invalidateQueries({
        queryKey: ['session_my_role', participant.session_id],
      })
    },
  })
}
