import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CompetitionAward } from '../types'

export function useCompetitionAwards(competitionId: string | undefined) {
  return useQuery({
    queryKey: ['competition-awards', competitionId],
    queryFn: async (): Promise<CompetitionAward[]> => {
      if (!competitionId) return []

      const { data, error } = await supabase
        .from('competition_awards')
        .select('*')
        .eq('competition_id', competitionId)
        .order('position')

      if (error) throw error
      return data || []
    },
    enabled: Boolean(competitionId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
