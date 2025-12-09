import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Post, PostWithUser, Session, Catch } from '../types'

// Fetch user's feed (posts from followed users + own posts)
// pageLimit/pageOffset allow simple client-side pagination (e.g. Load More)
export function useFeed(userId: string, pageLimit = 20, pageOffset = 0) {
  return useQuery<PostWithUser[]>({
    queryKey: ['feed', userId, pageLimit, pageOffset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_feed', {
        for_user_id: userId,
        page_limit: pageLimit,
        page_offset: pageOffset,
      })

      if (error) throw new Error(error.message)
      const basePosts = (data ?? []) as Post[]

      const enrichedPosts = await Promise.all(
        basePosts.map(async (post): Promise<PostWithUser | null> => {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', post.user_id)
            .single()

          if (userError) throw new Error(userError.message)

          let sessionData: (Session & { catches: Catch[] | null }) | null = null
          if (post.session_id) {
            const { data: session, error: sessionError } = await supabase
              .from('sessions')
              .select('*, catches(*)')
              .eq('id', post.session_id)
              .single()

            if (sessionError) throw new Error(sessionError.message)
            sessionData = session as Session & { catches: Catch[] | null }
          }

          let catchData: Catch | null = null
          if (post.catch_id) {
            const { data: catchRow, error: catchError } = await supabase
              .from('catches')
              .select('*')
              .eq('id', post.catch_id)
              .eq('is_public', true) // Only show public catches in feed
              .maybeSingle()

            if (catchError) throw new Error(catchError.message)
            catchData = catchRow as Catch | null
          }

          // Skip posts where the linked catch is private
          if (post.catch_id && !catchData) {
            return null
          }

          return {
            ...post,
            user: {
              id: userData.id,
              username: userData.username,
              full_name: userData.full_name,
              avatar_url: userData.avatar_url ?? null,
            },
            session: sessionData ?? undefined,
            catch: catchData ?? undefined,
            like_count: 0,
            comment_count: 0,
            is_liked_by_user: false,
          }
        }),
      )

      // Filter out null entries (private catches)
      return enrichedPosts.filter((post): post is PostWithUser => post !== null)
    },
    enabled: Boolean(userId),
  })
}

// Fetch posts by a specific user (for viewing someone else's profile)
export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: ['posts', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      const basePosts = (data ?? []) as Post[]

      const enrichedPosts: PostWithUser[] = await Promise.all(
        basePosts.map(async (post) => {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', post.user_id)
            .single()

          if (userError) throw new Error(userError.message)

          let sessionData: (Session & { catches: Catch[] | null }) | null = null
          if (post.session_id) {
            const { data: session, error: sessionError } = await supabase
              .from('sessions')
              .select('*, catches(*)')
              .eq('id', post.session_id)
              .single()

            if (sessionError) throw new Error(sessionError.message)
            sessionData = session as Session & { catches: Catch[] | null }
          }

          let catchData: Catch | null = null
          if (post.catch_id) {
            const { data: catchRow, error: catchError } = await supabase
              .from('catches')
              .select('*')
              .eq('id', post.catch_id)
              .single()

            if (catchError) throw new Error(catchError.message)
            catchData = catchRow as Catch
          }

          return {
            ...post,
            user: {
              id: userData.id,
              username: userData.username,
              full_name: userData.full_name,
              avatar_url: userData.avatar_url ?? null,
            },
            session: sessionData ?? undefined,
            catch: catchData ?? undefined,
            like_count: 0,
            comment_count: 0,
            is_liked_by_user: false,
          }
        }),
      )

      return enrichedPosts
    },
    enabled: Boolean(userId),
  })
}

// Toggle post visibility (public/private)
export function useTogglePostVisibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, isPublic }: { postId: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from('posts')
        .update({ is_public: isPublic })
        .eq('id', postId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// Fetch posts by the current user (own profile), including public and private
export function useOwnPosts(userId: string) {
  return useQuery({
    queryKey: ['posts', 'own', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      const basePosts = (data ?? []) as Post[]

      const enrichedPosts: PostWithUser[] = await Promise.all(
        basePosts.map(async (post) => {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', post.user_id)
            .single()

          if (userError) throw new Error(userError.message)

          let sessionData: (Session & { catches: Catch[] | null }) | null = null
          if (post.session_id) {
            const { data: session, error: sessionError } = await supabase
              .from('sessions')
              .select('*, catches(*)')
              .eq('id', post.session_id)
              .single()

            if (sessionError) throw new Error(sessionError.message)
            sessionData = session as Session & { catches: Catch[] | null }
          }

          let catchData: Catch | null = null
          if (post.catch_id) {
            const { data: catchRow, error: catchError } = await supabase
              .from('catches')
              .select('*')
              .eq('id', post.catch_id)
              .single()

            if (catchError) throw new Error(catchError.message)
            catchData = catchRow as Catch
          }

          return {
            ...post,
            user: {
              id: userData.id,
              username: userData.username,
              full_name: userData.full_name,
              avatar_url: userData.avatar_url ?? null,
            },
            session: sessionData ?? undefined,
            catch: catchData ?? undefined,
            like_count: 0,
            comment_count: 0,
            is_liked_by_user: false,
          }
        }),
      )

      return enrichedPosts
    },
    enabled: Boolean(userId),
  })
}

// Create a new post (share a session to feed)
export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newPost: {
      type: 'session' | 'catch' | 'photo'
      session_id?: string
      catch_id?: string
      photo_url?: string
      caption?: string
      location_privacy?: 'private' | 'general' | 'exact'
      isPublic?: boolean
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          ...newPost,
          is_public: newPost.isPublic ?? true,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Post
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] })
    },
  })
}

// Delete a post
export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// Repost an existing post into the user's feed
export function useRepost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, caption }: { postId: string; caption?: string }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Not authenticated')

      const { data: original, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (fetchError) throw new Error(fetchError.message)
      if (!original) throw new Error('Original post not found')

      const base = original as Post

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          type: base.type,
          session_id: base.session_id,
          catch_id: base.catch_id,
          photo_url: base.photo_url,
          location_privacy: base.location_privacy,
          caption: caption?.trim() || base.caption || null,
          is_public: true,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Post
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] })
    },
  })
}
