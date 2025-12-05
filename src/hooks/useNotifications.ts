import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Notification {
  id: string
  user_id: string
  type: 'competition_invite' | 'competition_starting_soon' | 'competition_winner' | 'catch_approved' | 'catch_rejected' | 'post_like' | 'post_comment' | 'follow' | 'session_catch'
  title: string
  message: string
  action_url: string | null
  related_user_id: string | null
  related_competition_id: string | null
  related_session_id: string | null
  related_catch_id: string | null
  related_post_id: string | null
  is_read: boolean
  created_at: string
  // Enriched fields
  related_user?: {
    id: string
    username: string
    avatar_url: string | null
  }
}

export function useNotifications() {
  const { user } = useAuth()

  return useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          related_user:profiles!notifications_related_user_id_fkey(id, username, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return (data ?? []) as Notification[]
    },
    enabled: Boolean(user?.id),
  })
}

export function useUnreadNotificationCount() {
  const { user } = useAuth()

  return useQuery<number>({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0

      const { data, error } = await supabase.rpc('get_unread_notification_count')

      if (error) throw error
      return data ?? 0
    },
    enabled: Boolean(user?.id),
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
