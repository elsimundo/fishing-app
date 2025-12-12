import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface CompetitionPlacement {
  competitionId: string
  competitionTitle: string
  position: number // 1, 2, or 3
  endedAt: string
  coverImageUrl: string | null
  totalWeight?: number
  catchCount?: number
}

export function useMyCompetitionPlacements() {
  const { user } = useAuth()

  return useQuery<CompetitionPlacement[]>({
    queryKey: ['competition-placements', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Get all completed competitions
      const { data: competitions, error: compError } = await supabase
        .from('competitions')
        .select('id, title, ends_at, cover_image_url, status')
        .eq('status', 'completed')
        .order('ends_at', { ascending: false })

      if (compError) throw new Error(compError.message)
      if (!competitions || competitions.length === 0) return []

      // For each completed competition, get the leaderboard and check user's position
      const placements: CompetitionPlacement[] = []

      for (const comp of competitions) {
        try {
          const { data: leaderboard, error: lbError } = await supabase.rpc(
            'get_competition_leaderboard',
            { p_competition_id: comp.id }
          )

          if (lbError) {
            console.error('Failed to get leaderboard for', comp.id, lbError)
            continue
          }

          if (!leaderboard || leaderboard.length === 0) continue

          // Find user's position (1-indexed)
          const userIndex = leaderboard.findIndex(
            (entry: any) => entry.user_id === user.id
          )

          if (userIndex !== -1 && userIndex < 3) {
            // User is in top 3
            const entry = leaderboard[userIndex]
            placements.push({
              competitionId: comp.id,
              competitionTitle: comp.title,
              position: userIndex + 1, // 1, 2, or 3
              endedAt: comp.ends_at,
              coverImageUrl: comp.cover_image_url,
              totalWeight: entry.total_weight,
              catchCount: entry.catch_count,
            })
          }
        } catch (error) {
          console.error('Error checking placement for competition', comp.id, error)
        }
      }

      return placements
    },
    enabled: Boolean(user?.id),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}
