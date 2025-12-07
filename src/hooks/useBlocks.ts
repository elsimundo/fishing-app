import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Get list of users the current user has blocked
export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blocked-users'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocked_id,
          created_at,
          blocked:profiles!blocked_users_blocked_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  })
}

// Check if current user has blocked a specific user
export function useIsBlocked(userId: string | undefined) {
  return useQuery({
    queryKey: ['is-blocked', userId],
    queryFn: async () => {
      if (!userId) return false

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    },
    enabled: Boolean(userId),
  })
}

// Get list of blocked user IDs (for filtering)
export function useBlockedUserIds() {
  return useQuery({
    queryKey: ['blocked-user-ids'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id)

      if (error) throw error
      return (data || []).map((row) => row.blocked_id)
    },
  })
}

// Block a user
export function useBlockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('blocked_users').insert({
        blocker_id: user.id,
        blocked_id: targetUserId,
      })

      if (error) throw error
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
      queryClient.invalidateQueries({ queryKey: ['blocked-user-ids'] })
      queryClient.invalidateQueries({ queryKey: ['is-blocked', targetUserId] })
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
      queryClient.invalidateQueries({ queryKey: ['follow-counts'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// Unblock a user
export function useUnblockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetUserId)

      if (error) throw error
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
      queryClient.invalidateQueries({ queryKey: ['blocked-user-ids'] })
      queryClient.invalidateQueries({ queryKey: ['is-blocked', targetUserId] })
    },
  })
}
