import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { CompetitionEntry } from '../types'

export function useCompetitionLeaderboard(competitionId: string) {
  return useQuery({
    queryKey: ['competition-leaderboard', competitionId],
    queryFn: async () => {
      if (!competitionId) return []

      const { data, error } = await supabase
        .rpc('get_competition_leaderboard', {
          p_competition_id: competitionId
        })

      if (error) throw new Error(error.message)

      return (data ?? [])
    },
    enabled: Boolean(competitionId),
  })
}

export function useUserEntry(competitionId: string) {
  const { user } = useAuth()

  return useQuery<CompetitionEntry | null>({
    queryKey: ['competition-entry', competitionId, user?.id],
    queryFn: async () => {
      if (!competitionId || !user) return null

      const { data, error } = await supabase
        .from('competition_entries')
        .select(
          `*,
           user:profiles!competition_entries_user_id_fkey(id, username, full_name, avatar_url),
           session:sessions(id, title, cover_photo_url)`
        )
        .eq('competition_id', competitionId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw new Error(error.message)

      return (data as CompetitionEntry) ?? null
    },
    enabled: Boolean(competitionId && user?.id),
  })
}

export function useSubmitEntry() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ competitionId, sessionId }: { competitionId: string; sessionId: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { data: scoreData, error: scoreError } = await supabase.rpc('calculate_competition_score', {
        p_competition_id: competitionId,
        p_session_id: sessionId,
      })

      if (scoreError) throw new Error(scoreError.message)

      const { data, error } = await supabase
        .from('competition_entries')
        .insert({
          competition_id: competitionId,
          user_id: user.id,
          session_id: sessionId,
          score: scoreData,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      const { error: leaderboardError } = await supabase.rpc('update_competition_leaderboard', {
        p_competition_id: competitionId,
      })

      if (leaderboardError) throw new Error(leaderboardError.message)

      return data as CompetitionEntry
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['competition-leaderboard', entry.competition_id] })
      queryClient.invalidateQueries({ queryKey: ['competition-entry', entry.competition_id] })
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
    },
  })
}

export function useWithdrawEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('competition_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['competition-entry'] })
    },
  })
}
