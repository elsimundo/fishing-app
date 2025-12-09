import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Types
export interface Challenge {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
  criteria: Record<string, unknown>
  xp_reward: number
  sort_order: number
  is_featured: boolean
  featured_until: string | null
  water_type: 'saltwater' | 'freshwater' | 'both'
}

export interface UserChallenge {
  id: string
  user_id: string
  challenge_id: string
  progress: number
  target: number
  completed_at: string | null
  xp_awarded: number
  challenge?: Challenge
}

export interface WeeklySpeciesPoints {
  id: string
  species: string
  points: number
  week_start: string
  is_bonus: boolean
  bonus_reason: string | null
  water_type: 'saltwater' | 'freshwater'
}

export interface UserWeeklyStats {
  id: string
  user_id: string
  week_start: string
  catches_count: number
  fishing_days: number
  species_points: number
  xp_earned: number
}

export interface XPResult {
  new_xp: number
  new_level: number
  leveled_up: boolean
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  xp: number
  level: number
  species_points: number
  rank: number
}

// Calculate level from XP (mirrors DB function)
export function calculateLevel(xp: number): number {
  let level = 1
  let xpNeeded = 0
  while (xp >= xpNeeded) {
    level++
    xpNeeded += level * 50
  }
  return level - 1
}

// Calculate XP needed for next level
export function xpForNextLevel(currentLevel: number): number {
  let totalXp = 0
  let lvl = 1
  while (lvl <= currentLevel) {
    lvl++
    totalXp += lvl * 50
  }
  return totalXp
}

// Calculate XP progress within current level
export function xpProgress(xp: number, level: number): { current: number; needed: number; percentage: number } {
  const xpForCurrent = level > 1 ? xpForNextLevel(level - 1) : 0
  const xpForNext = xpForNextLevel(level)
  const current = xp - xpForCurrent
  const needed = xpForNext - xpForCurrent
  return {
    current,
    needed,
    percentage: Math.min(100, Math.round((current / needed) * 100))
  }
}

// Get level tier for styling
export function getLevelTier(level: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
  if (level >= 50) return 'diamond'
  if (level >= 30) return 'platinum'
  if (level >= 20) return 'gold'
  if (level >= 10) return 'silver'
  return 'bronze'
}

// Fetch user's XP and level
export function useUserXP() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['user-xp', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('profiles')
        .select('xp, level, total_challenges_completed')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      return data as { xp: number; level: number; total_challenges_completed: number }
    },
    enabled: !!user,
  })
}

// Fetch all active challenges
export function useChallenges(waterType?: 'saltwater' | 'freshwater' | 'both') {
  return useQuery({
    queryKey: ['challenges', waterType],
    queryFn: async () => {
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      
      // Filter by water type if specified
      if (waterType && waterType !== 'both') {
        query = query.or(`water_type.eq.${waterType},water_type.eq.both`)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as Challenge[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch user's challenge progress
export function useUserChallenges() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['user-challenges', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('user_challenges')
        .select(`
          *,
          challenge:challenges(*)
        `)
        .eq('user_id', user.id)
      
      if (error) throw error
      return data as UserChallenge[]
    },
    enabled: !!user,
  })
}

// Fetch this week's species points
export function useWeeklySpeciesPoints(waterType?: 'saltwater' | 'freshwater') {
  return useQuery({
    queryKey: ['weekly-species-points', waterType],
    queryFn: async () => {
      // Get current week start (Monday)
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const weekStart = new Date(now.setDate(diff))
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split('T')[0]
      
      let query = supabase
        .from('weekly_species_points')
        .select('*')
        .eq('week_start', weekStartStr)
        .order('points', { ascending: false })
      
      if (waterType) {
        query = query.eq('water_type', waterType)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as WeeklySpeciesPoints[]
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

// Fetch user's weekly stats
export function useUserWeeklyStats() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['user-weekly-stats', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      // Get current week start
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const weekStart = new Date(now.setDate(diff))
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('user_weekly_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data as UserWeeklyStats | null
    },
    enabled: !!user,
  })
}

// Fetch weekly leaderboard
export function useWeeklyLeaderboard(limit = 20) {
  return useQuery({
    queryKey: ['weekly-leaderboard', limit],
    queryFn: async () => {
      // Get current week start
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const weekStart = new Date(now.setDate(diff))
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('user_weekly_stats')
        .select(`
          user_id,
          species_points,
          catches_count,
          profile:profiles!user_id(username, display_name, avatar_url, xp, level)
        `)
        .eq('week_start', weekStartStr)
        .order('species_points', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      
      return (data || []).map((entry, index) => ({
        user_id: entry.user_id,
        username: (entry.profile as any)?.username || 'Unknown',
        display_name: (entry.profile as any)?.display_name || (entry.profile as any)?.username || 'Unknown',
        avatar_url: (entry.profile as any)?.avatar_url,
        xp: (entry.profile as any)?.xp || 0,
        level: (entry.profile as any)?.level || 1,
        species_points: entry.species_points,
        catches_count: entry.catches_count,
        rank: index + 1,
      })) as LeaderboardEntry[]
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

// Award XP mutation
export function useAwardXP() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ 
      amount, 
      reason, 
      referenceType, 
      referenceId 
    }: { 
      amount: number
      reason: string
      referenceType?: string
      referenceId?: string
    }) => {
      if (!user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: amount,
        p_reason: reason,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null,
      })
      
      if (error) throw error
      return data[0] as XPResult
    },
    onSuccess: (data) => {
      // Invalidate user XP query
      queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      queryClient.invalidateQueries({ queryKey: ['user-weekly-stats'] })
      
      // Return level up info for celebration
      return data
    },
  })
}

// Update challenge progress mutation
export function useUpdateChallengeProgress() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({
      challengeId,
      progress,
      target,
    }: {
      challengeId: string
      progress: number
      target: number
    }) => {
      if (!user) throw new Error('Not authenticated')
      
      const completed = progress >= target
      
      const { data, error } = await supabase
        .from('user_challenges')
        .upsert({
          user_id: user.id,
          challenge_id: challengeId,
          progress,
          target,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,challenge_id',
        })
        .select()
        .single()
      
      if (error) throw error
      return { ...data, justCompleted: completed }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
    },
  })
}

// Complete challenge and award XP
export function useCompleteChallenge() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({
      challengeId,
      xpReward,
    }: {
      challengeId: string
      xpReward: number
    }) => {
      if (!user) throw new Error('Not authenticated')
      
      // Mark challenge as completed
      const { error: challengeError } = await supabase
        .from('user_challenges')
        .upsert({
          user_id: user.id,
          challenge_id: challengeId,
          progress: 1,
          target: 1,
          completed_at: new Date().toISOString(),
          xp_awarded: xpReward,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,challenge_id',
        })
      
      if (challengeError) throw challengeError
      
      // Award XP
      const { data: xpData, error: xpError } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: xpReward,
        p_reason: 'challenge_completed',
        p_reference_type: 'challenge',
        p_reference_id: challengeId,
      })
      
      if (xpError) throw xpError
      
      // Update total challenges completed
      await supabase
        .from('profiles')
        .update({ 
          total_challenges_completed: supabase.rpc('increment_challenges_completed')
        })
        .eq('id', user.id)
      
      return xpData[0] as XPResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
    },
  })
}

// Get featured challenge (Challenge of the Month)
export function useFeaturedChallenge() {
  return useQuery({
    queryKey: ['featured-challenge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_featured', true)
        .eq('is_active', true)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data as Challenge | null
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
