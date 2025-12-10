import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ParticipantRole, SessionParticipant } from '../types'

// Helper to rank participant statuses so we can pick the "best" one
// when there are multiple rows for the same user.
function statusPriority(status: string | null): number {
  switch (status) {
    case 'active':
      return 0
    case 'pending':
      return 1
    case 'left':
      return 2
    case 'removed':
      return 3
    default:
      return 4
  }
}

async function fetchSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
  const { data, error } = await supabase
    .from('session_participants')
    .select('*, user:profiles(*)')
    .eq('session_id', sessionId)
    .order('invited_at', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as SessionParticipant[]

  // Deduplicate by user_id and choose the row with the best status.
  // This prevents showing both a pending invite and an active row
  // for the same user once they have joined.
  const byUser = new Map<string, SessionParticipant>()

  for (const row of rows) {
    if (!row.user_id) continue

    const existing = byUser.get(row.user_id)
    if (!existing) {
      byUser.set(row.user_id, row)
      continue
    }

    const existingPriority = statusPriority((existing as any).status)
    const newPriority = statusPriority((row as any).status)

    if (newPriority < existingPriority) {
      byUser.set(row.user_id, row)
    }
  }

  return Array.from(byUser.values())
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
    .eq('status', 'active')
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
      // Use upsert so re-inviting a user who previously left/was removed
      // updates their row instead of violating the unique constraint on
      // (session_id, user_id).
      const { data, error } = await supabase
        .from('session_participants')
        .upsert(
          {
            session_id: input.session_id,
            user_id: input.user_id,
            role: input.role,
            status: 'pending',
            invited_at: new Date().toISOString(),
            joined_at: null,
            left_at: null,
          },
          { onConflict: 'session_id,user_id' },
        )
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
