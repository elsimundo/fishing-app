import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface LakeAnnouncement {
  id: string
  lake_id: string
  author_id: string
  title: string
  content: string
  is_pinned: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  author?: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

/**
 * Fetch announcements for a lake
 */
export function useLakeAnnouncements(lakeId: string | undefined) {
  return useQuery({
    queryKey: ['lake-announcements', lakeId],
    queryFn: async () => {
      if (!lakeId) return []

      const { data, error } = await supabase
        .from('lake_announcements')
        .select(`
          *,
          author:profiles!author_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('lake_id', lakeId)
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as LakeAnnouncement[]
    },
    enabled: !!lakeId,
  })
}

/**
 * Create a new announcement
 */
export function useCreateLakeAnnouncement() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      lakeId,
      title,
      content,
      isPinned = false,
    }: {
      lakeId: string
      title: string
      content: string
      isPinned?: boolean
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('lake_announcements')
        .insert({
          lake_id: lakeId,
          author_id: user.id,
          title,
          content,
          is_pinned: isPinned,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lake-announcements', variables.lakeId] })
    },
  })
}

/**
 * Update an announcement
 */
export function useUpdateLakeAnnouncement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      lakeId,
      title,
      content,
      isPinned,
      isActive,
    }: {
      id: string
      lakeId: string
      title?: string
      content?: string
      isPinned?: boolean
      isActive?: boolean
    }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (title !== undefined) updates.title = title
      if (content !== undefined) updates.content = content
      if (isPinned !== undefined) updates.is_pinned = isPinned
      if (isActive !== undefined) updates.is_active = isActive

      const { data, error } = await supabase
        .from('lake_announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, lakeId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['lake-announcements', result.lakeId] })
    },
  })
}

/**
 * Delete an announcement (soft delete by setting is_active = false)
 */
export function useDeleteLakeAnnouncement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, lakeId }: { id: string; lakeId: string }) => {
      const { error } = await supabase
        .from('lake_announcements')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      return { lakeId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['lake-announcements', result.lakeId] })
    },
  })
}
