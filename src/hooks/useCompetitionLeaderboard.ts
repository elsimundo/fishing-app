import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { CompetitionLeaderboardEntry } from '../types'

export function useCompetitionLeaderboard(competitionId: string) {
  return useQuery<CompetitionLeaderboardEntry[]>({
    queryKey: ['competition-leaderboard', competitionId],
    queryFn: async () => {
      if (!competitionId) return []

      const { data, error } = await supabase.rpc('get_competition_leaderboard', {
        p_competition_id: competitionId,
      })

      if (error) throw new Error(error.message)
      return (data ?? []) as CompetitionLeaderboardEntry[]
    },
    enabled: Boolean(competitionId),
    refetchInterval: 30000,
  })
}

export function useMyCompetitionCatches(competitionId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-competition-catches', competitionId, user?.id],
    queryFn: async () => {
      if (!user || !competitionId) return []

      const { data: comp, error: compError } = await supabase
        .from('competitions')
        .select('session_id')
        .eq('id', competitionId)
        .maybeSingle()

      if (compError) throw new Error(compError.message)
      if (!comp?.session_id) return []

      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .eq('session_id', comp.session_id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: Boolean(user?.id && competitionId),
  })
}
