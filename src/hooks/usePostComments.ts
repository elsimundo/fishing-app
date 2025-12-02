import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PostComment } from '../types'

export interface PostCommentWithUser extends PostComment {
  user: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

export function usePostComments(postId: string) {
  return useQuery<PostCommentWithUser[]>({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(
          `*,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )`,
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw new Error(error.message)

      const rows = (data ?? []) as unknown as Array<PostComment & { profiles: any }>
      return rows.map((row) => ({
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id,
        text: row.text,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user: {
          id: row.profiles?.id ?? row.user_id,
          username: row.profiles?.username ?? null,
          full_name: row.profiles?.full_name ?? null,
          avatar_url: row.profiles?.avatar_url ?? null,
        },
      }))
    },
    enabled: Boolean(postId),
  })
}

export function useAddPostComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          text: trimmed,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as PostComment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] })
    },
  })
}
