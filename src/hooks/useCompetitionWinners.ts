import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

interface CompetitionWinner {
  id: string
  competition_id: string
  user_id: string
  category: string
  catch_id: string | null
  notes: string | null
  declared_at: string
  user: {
    username: string
    avatar_url: string | null
  }
}

/**
 * Get winners for a competition
 */
export function useCompetitionWinners(competitionId: string) {
  return useQuery({
    queryKey: ['competition-winners', competitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competition_winners')
        .select(`
          *,
          user:profiles!competition_winners_user_id_fkey(
            username,
            avatar_url
          )
        `)
        .eq('competition_id', competitionId)
        .order('declared_at', { ascending: false })

      if (error) throw error
      return data as CompetitionWinner[]
    },
    enabled: !!competitionId,
  })
}

/**
 * Declare a winner
 */
export function useDeclareWinner() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      competitionId,
      winnerUserId,
      category,
      catchId,
      notes,
    }: {
      competitionId: string
      winnerUserId: string
      category: string
      catchId?: string
      notes?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('declare_competition_winner', {
        p_competition_id: competitionId,
        p_organizer_id: user.id,
        p_winner_user_id: winnerUserId,
        p_category: category,
        p_catch_id: catchId || null,
        p_notes: notes || null,
      })

      if (error) throw error
      
      // Check winner/podium challenges for the winner
      await checkCompetitionWinnerChallenges(winnerUserId, competitionId)
      
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['competition-winners', variables.competitionId],
      })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      toast.success('Winner declared!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to declare winner')
    },
  })
}

/**
 * Check and complete competition winner/podium challenges
 */
async function checkCompetitionWinnerChallenges(userId: string, competitionId: string) {
  // Get all winners for this competition to determine placement
  const { data: winners } = await supabase
    .from('competition_winners')
    .select('user_id, category')
    .eq('competition_id', competitionId)
    .order('declared_at', { ascending: true })
  
  if (!winners) return
  
  // Check if this user won (1st place in any category)
  const userWins = winners.filter(w => w.user_id === userId)
  const isWinner = userWins.length > 0
  
  // Count total wins across all competitions
  const { count: totalWins } = await supabase
    .from('competition_winners')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  
  // Check podium (top 3) - for this we check leaderboard position
  const { data: leaderboard } = await supabase
    .rpc('get_competition_leaderboard', { p_competition_id: competitionId })
  
  const userRank = leaderboard?.findIndex((entry: any) => entry.user_id === userId) ?? -1
  const isPodium = userRank >= 0 && userRank < 3
  
  // Count total podium finishes
  // This is simplified - in production you'd track this more accurately
  const podiumCount = isPodium ? 1 : 0
  
  const challenges = [
    { slug: 'comp_winner', check: isWinner, value: totalWins || 1, target: 1 },
    { slug: 'comp_podium', check: isPodium, value: podiumCount, target: 1 },
  ]
  
  for (const c of challenges) {
    if (!c.check) continue
    
    // Get challenge
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, xp_reward')
      .eq('slug', c.slug)
      .maybeSingle()
    
    if (!challenge) continue
    
    // Check if already completed
    const { data: existing } = await supabase
      .from('user_challenges')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('challenge_id', challenge.id)
      .maybeSingle()
    
    if (existing?.completed_at) continue
    
    // Complete the challenge
    await supabase
      .from('user_challenges')
      .upsert({
        user_id: userId,
        challenge_id: challenge.id,
        progress: c.value,
        target: c.target,
        completed_at: new Date().toISOString(),
        xp_awarded: challenge.xp_reward,
      }, { onConflict: 'user_id,challenge_id' })
    
    // Award XP
    await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_amount: challenge.xp_reward,
      p_reason: 'challenge_completed',
      p_reference_type: 'challenge',
      p_reference_id: challenge.id,
    })
  }
}

/**
 * Remove a winner declaration
 */
export function useRemoveWinner() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      winnerId,
      competitionId,
    }: {
      winnerId: string
      competitionId: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('remove_competition_winner', {
        p_winner_id: winnerId,
        p_organizer_id: user.id,
      })

      if (error) throw error
      return { winnerId, competitionId }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['competition-winners', variables.competitionId],
      })
      toast.success('Winner removed')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove winner')
    },
  })
}
