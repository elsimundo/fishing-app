import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Check if current user follows another user
export function useIsFollowing(targetUserId?: string) {
  return useQuery({
    queryKey: ['is-following', targetUserId],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!user || !targetUserId) return false

      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle()

      if (error) throw new Error(error.message)
      return Boolean(data)
    },
    enabled: Boolean(targetUserId),
  })
}

// Get follower/following counts for a user
export function useFollowCounts(userId: string) {
  return useQuery({
    queryKey: ['follow-counts', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_follow_counts', {
        for_user_id: userId,
      })

      if (error) throw new Error(error.message)
      const row = (data ?? [])[0] as { follower_count: number; following_count: number } | undefined
      return row ?? { follower_count: 0, following_count: 0 }
    },
    enabled: Boolean(userId),
  })
}

// Get list of followers
export function useFollowers(userId: string) {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select(
          `follower_id,
          profiles:follower_id (
            id,
            username,
            full_name,
            avatar_url
          )`,
        )
        .eq('following_id', userId)

      if (error) throw new Error(error.message)
      return data as unknown[]
    },
    enabled: Boolean(userId),
  })
}

// Get list of following
export function useFollowing(userId: string) {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select(
          `following_id,
          profiles:following_id (
            id,
            username,
            full_name,
            avatar_url
          )`,
        )
        .eq('follower_id', userId)

      if (error) throw new Error(error.message)
      return data as unknown[]
    },
    enabled: Boolean(userId),
  })
}

// Follow a user
export function useFollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: targetUserId,
      })

      if (error) throw new Error(error.message)
      
      // Check follower challenges for the TARGET user (they gained a follower)
      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId)
      
      await checkFollowerChallenges(targetUserId, followerCount || 0)
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['is-following', targetUserId] })
      queryClient.invalidateQueries({ queryKey: ['follow-counts'] })
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
    },
  })
}

/**
 * Check and complete follower-based social challenges
 */
async function checkFollowerChallenges(userId: string, followerCount: number) {
  const milestones = [
    { slug: 'first_follower', value: 1 },
    { slug: 'influencer', value: 50 },
  ]
  
  for (const m of milestones) {
    if (followerCount >= m.value) {
      // Get challenge
      const { data: challenge } = await supabase
        .from('challenges')
        .select('id, xp_reward')
        .eq('slug', m.slug)
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
          progress: followerCount,
          target: m.value,
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
}

// Unfollow a user
export function useUnfollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)

      if (error) throw new Error(error.message)
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['is-following', targetUserId] })
      queryClient.invalidateQueries({ queryKey: ['follow-counts'] })
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// Toggle follow (smart hook)
export function useToggleFollow() {
  const followUser = useFollowUser()
  const unfollowUser = useUnfollowUser()

  return {
    mutate: async (targetUserId: string, isCurrentlyFollowing: boolean) => {
      if (isCurrentlyFollowing) {
        await unfollowUser.mutateAsync(targetUserId)
      } else {
        await followUser.mutateAsync(targetUserId)
      }
    },
    isPending: followUser.isPending || unfollowUser.isPending,
  }
}
