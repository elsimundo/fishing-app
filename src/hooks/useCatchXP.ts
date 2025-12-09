import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

interface CatchXPInput {
  catchId: string
  species: string
  weightLb?: number | null
  sessionId?: string | null
  hasPhoto?: boolean
}

interface XPBreakdown {
  base: number
  speciesBonus: number
  weightBonus: number
  photoBonus: number
  weeklySpeciesBonus: number
  total: number
}

interface CatchXPResult {
  xpAwarded: number
  breakdown: XPBreakdown
  newXP: number
  newLevel: number
  leveledUp: boolean
  challengesCompleted: string[]
  weeklySpeciesPoints: number
}

const XP_VALUES = {
  BASE_CATCH: 10,
  PHOTO_BONUS: 5,
  WEIGHT_BONUS_PER_5LB: 5,
  NEW_SPECIES_BONUS: 25,
}

/**
 * Hook to process XP and challenge progress when a catch is logged
 */
export function useCatchXP() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (input: CatchXPInput): Promise<CatchXPResult> => {
      if (!user) throw new Error('Not authenticated')
      
      const breakdown: XPBreakdown = {
        base: XP_VALUES.BASE_CATCH,
        speciesBonus: 0,
        weightBonus: 0,
        photoBonus: 0,
        weeklySpeciesBonus: 0,
        total: 0,
      }
      
      const challengesCompleted: string[] = []
      let weeklySpeciesPoints = 0
      
      // Check if new species for user
      const { data: existingCatches } = await supabase
        .from('catches')
        .select('id')
        .eq('user_id', user.id)
        .ilike('species', input.species)
        .neq('id', input.catchId)
        .limit(1)
      
      if (!existingCatches || existingCatches.length === 0) {
        breakdown.speciesBonus = XP_VALUES.NEW_SPECIES_BONUS
      }
      
      // Weight bonus (5 XP per 5lb)
      if (input.weightLb && input.weightLb > 0) {
        breakdown.weightBonus = Math.floor(input.weightLb / 5) * XP_VALUES.WEIGHT_BONUS_PER_5LB
      }
      
      // Photo bonus
      if (input.hasPhoto) {
        breakdown.photoBonus = XP_VALUES.PHOTO_BONUS
      }
      
      // Weekly species points check
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const weekStart = new Date(now.setDate(diff))
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split('T')[0]
      
      const { data: weeklyPoints } = await supabase
        .from('weekly_species_points')
        .select('points, is_bonus')
        .eq('week_start', weekStartStr)
        .ilike('species', input.species)
        .single()
      
      if (weeklyPoints) {
        weeklySpeciesPoints = weeklyPoints.points
        breakdown.weeklySpeciesBonus = weeklyPoints.is_bonus ? 10 : 5
      }
      
      // Calculate total
      breakdown.total = breakdown.base + breakdown.speciesBonus + breakdown.weightBonus + 
                        breakdown.photoBonus + breakdown.weeklySpeciesBonus
      
      // Award XP via database function
      const { data: xpResult, error: xpError } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: breakdown.total,
        p_reason: 'catch_logged',
        p_reference_type: 'catch',
        p_reference_id: input.catchId,
      })
      
      if (xpError) {
        console.error('Failed to award XP:', xpError)
        throw xpError
      }
      
      // Check and update challenges
      await checkChallenges(user.id, input, challengesCompleted)
      
      const result = xpResult?.[0] || { new_xp: 0, new_level: 1, leveled_up: false }
      
      return {
        xpAwarded: breakdown.total,
        breakdown,
        newXP: result.new_xp,
        newLevel: result.new_level,
        leveledUp: result.leveled_up,
        challengesCompleted,
        weeklySpeciesPoints,
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      queryClient.invalidateQueries({ queryKey: ['user-weekly-stats'] })
      
      // Show XP toast
      if (data.xpAwarded > 0) {
        const bonusText = data.weeklySpeciesPoints > 0 
          ? ` (+${data.weeklySpeciesPoints} species pts)` 
          : ''
        toast.success(`+${data.xpAwarded} XP${bonusText}`, { icon: '⭐', duration: 3000 })
      }
      
      // Level up celebration
      if (data.leveledUp) {
        setTimeout(() => {
          toast.success(`Level Up! You're now level ${data.newLevel}! 🎉`, { duration: 5000, icon: '🏆' })
        }, 500)
      }
      
      // Challenge completion
      if (data.challengesCompleted.length > 0) {
        setTimeout(() => {
          toast.success(`Challenge completed! 🏅`, { duration: 4000 })
        }, 1000)
      }
    },
  })
}

/**
 * Check and complete challenges based on catch
 */
async function checkChallenges(userId: string, input: CatchXPInput, completed: string[]) {
  // Get total catch count
  const { count: totalCatches } = await supabase
    .from('catches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  
  // Get unique species count
  const { data: speciesData } = await supabase
    .from('catches')
    .select('species')
    .eq('user_id', userId)
  
  const speciesCount = new Set(speciesData?.map(c => c.species.toLowerCase())).size
  
  // Check milestone challenges
  const milestones = [
    { slug: 'first_catch', type: 'catch', value: 1 },
    { slug: 'catch_10', type: 'catch', value: 10 },
    { slug: 'catch_50', type: 'catch', value: 50 },
    { slug: 'catch_100', type: 'catch', value: 100 },
    { slug: 'catch_500', type: 'catch', value: 500 },
    { slug: 'species_5', type: 'species', value: 5 },
    { slug: 'species_10', type: 'species', value: 10 },
    { slug: 'species_25', type: 'species', value: 25 },
  ]
  
  for (const m of milestones) {
    const current = m.type === 'catch' ? (totalCatches || 0) : speciesCount
    if (current >= m.value) {
      await completeChallenge(userId, m.slug, current, m.value, completed)
    }
  }
  
  // Check species-specific challenge
  const speciesSlug = `catch_${input.species.toLowerCase().replace(/\s+/g, '_')}`
  await completeChallenge(userId, speciesSlug, 1, 1, completed)
  
  // Check photo challenge if has photo
  if (input.hasPhoto) {
    const { count: photoCount } = await supabase
      .from('catches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('photo_url', 'is', null)
    
    if (photoCount && photoCount >= 10) {
      await completeChallenge(userId, 'photo_pro', photoCount, 10, completed)
    }
  }
}

/**
 * Complete a challenge if not already completed
 */
async function completeChallenge(
  userId: string, 
  slug: string, 
  progress: number, 
  target: number,
  completed: string[]
) {
  // Get challenge
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, xp_reward')
    .eq('slug', slug)
    .single()
  
  if (!challenge) return
  
  // Check if already completed
  const { data: existing } = await supabase
    .from('user_challenges')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('challenge_id', challenge.id)
    .single()
  
  if (existing?.completed_at) return
  
  // Complete the challenge
  await supabase
    .from('user_challenges')
    .upsert({
      user_id: userId,
      challenge_id: challenge.id,
      progress,
      target,
      completed_at: new Date().toISOString(),
      xp_awarded: challenge.xp_reward,
    }, { onConflict: 'user_id,challenge_id' })
  
  // Award challenge XP
  await supabase.rpc('award_xp', {
    p_user_id: userId,
    p_amount: challenge.xp_reward,
    p_reason: 'challenge_completed',
    p_reference_type: 'challenge',
    p_reference_id: challenge.id,
  })
  
  completed.push(slug)
}

/**
 * Hook to award XP when a session is completed
 */
export function useSessionXP() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ sessionId, catchCount }: { sessionId: string; catchCount: number }) => {
      if (!user) throw new Error('Not authenticated')
      
      // Base XP + bonus for catches (max 20)
      const baseXP = 15
      const catchBonus = Math.min(catchCount * 2, 20)
      const totalXP = baseXP + catchBonus
      
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: totalXP,
        p_reason: 'session_completed',
        p_reference_type: 'session',
        p_reference_id: sessionId,
      })
      
      if (error) throw error
      
      // Check session milestone challenges
      const { count: sessionCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
      
      const completed: string[] = []
      
      if (sessionCount && sessionCount >= 1) {
        await completeChallenge(user.id, 'first_session', sessionCount, 1, completed)
      }
      if (sessionCount && sessionCount >= 10) {
        await completeChallenge(user.id, 'session_10', sessionCount, 10, completed)
      }
      
      return {
        ...(data?.[0] || { new_xp: 0, new_level: 1, leveled_up: false }),
        totalXP,
        challengesCompleted: completed,
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      
      toast.success(`Session complete! +${data.totalXP} XP`, { icon: '✅', duration: 3000 })
      
      if (data.leveled_up) {
        setTimeout(() => {
          toast.success(`Level Up! You're now level ${data.new_level}! 🎉`, { duration: 5000, icon: '🏆' })
        }, 500)
      }
      
      if (data.challengesCompleted.length > 0) {
        setTimeout(() => {
          toast.success(`Challenge completed! 🏅`, { duration: 4000 })
        }, 1000)
      }
    },
  })
}
