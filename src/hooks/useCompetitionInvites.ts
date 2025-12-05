import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface CompetitionInvite {
  id: string
  competition_id: string
  inviter_id: string
  invitee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  responded_at: string | null
  // Enriched fields
  competition?: {
    id: string
    title: string
    type: string
    starts_at: string
    ends_at: string
  }
  inviter?: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
}

export function useMyCompetitionInvites() {
  const { user } = useAuth()

  return useQuery<CompetitionInvite[]>({
    queryKey: ['competition-invites', 'received', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('competition_invites')
        .select(`
          *,
          competition:competitions(id, title, type, starts_at, ends_at),
          inviter:profiles!competition_invites_inviter_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as CompetitionInvite[]
    },
    enabled: Boolean(user?.id),
  })
}

export function useInviteToCompetition() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ competitionId, userIds }: { competitionId: string; userIds: string[] }) => {
      if (!user) throw new Error('Not authenticated')

      const invites = userIds.map(userId => ({
        competition_id: competitionId,
        inviter_id: user.id,
        invitee_id: userId,
      }))

      const { data, error } = await supabase
        .from('competition_invites')
        .insert(invites)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-invites'] })
    },
  })
}

export function useRespondToCompetitionInvite() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ inviteId, accept }: { inviteId: string; accept: boolean }) => {
      if (!user) throw new Error('Not authenticated')

      // Update invite status
      const { data: invite, error: updateError } = await supabase
        .from('competition_invites')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId)
        .select('competition_id')
        .single()

      if (updateError) throw updateError

      // If accepted, add user as participant to the competition's session
      if (accept && invite) {
        const { data: competition, error: compError } = await supabase
          .from('competitions')
          .select('session_id')
          .eq('id', invite.competition_id)
          .single()

        if (compError) throw compError

        if (competition?.session_id) {
          const { error: participantError } = await supabase
            .from('session_participants')
            .insert({
              session_id: competition.session_id,
              user_id: user.id,
              role: 'contributor',
              status: 'active',
            })

          if (participantError && participantError.code !== '23505') {
            // Ignore duplicate key error
            throw participantError
          }
        }
      }

      return invite
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-invites'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
      queryClient.invalidateQueries({ queryKey: ['session_participants'] })
    },
  })
}
