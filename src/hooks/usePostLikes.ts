import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Check if user has liked a post
export function useIsPostLiked(postId: string, userId?: string) {
  return useQuery({
    queryKey: ['post-like', postId, userId],
    queryFn: async () => {
      if (!userId) return false

      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw new Error(error.message)
      return Boolean(data)
    },
    enabled: Boolean(postId) && Boolean(userId),
  })
}

// Get like count for a post
export function usePostLikeCount(postId: string) {
  return useQuery({
    queryKey: ['post-like-count', postId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      if (error) throw new Error(error.message)
      return count ?? 0
    },
    enabled: Boolean(postId),
  })
}

// Like a post
export function useLikePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('post_likes').insert({
        post_id: postId,
        user_id: user.id,
      })

      if (error) throw new Error(error.message)
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['post-like', postId] })
      queryClient.invalidateQueries({ queryKey: ['post-like-count', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// Unlike a post
export function useUnlikePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (error) throw new Error(error.message)
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['post-like', postId] })
      queryClient.invalidateQueries({ queryKey: ['post-like-count', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// Toggle like (smart hook that likes or unlikes)
export function useToggleLike() {
  const likePost = useLikePost()
  const unlikePost = useUnlikePost()

  return {
    mutate: async (postId: string, isCurrentlyLiked: boolean) => {
      if (isCurrentlyLiked) {
        await unlikePost.mutateAsync(postId)
      } else {
        await likePost.mutateAsync(postId)
      }
    },
    isPending: likePost.isPending || unlikePost.isPending,
  }
}
