import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'gif'
  image_url: string | null
  gif_url: string | null
  deleted_at: string | null
  created_at: string
  sender?: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
  reactions?: MessageReaction[]
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface Conversation {
  id: string
  created_at: string
  updated_at: string
  participants: {
    user_id: string
    last_read_at: string
    profile: {
      id: string
      username: string
      full_name: string | null
      avatar_url: string | null
    }
  }[]
  last_message?: Message
  unread_count: number
}

// Get all conversations for current user
export function useConversations() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Get conversations the user is part of
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)

      if (partError) throw partError
      if (!participations?.length) return []

      const conversationIds = participations.map(p => p.conversation_id)
      const lastReadMap = new Map(participations.map(p => [p.conversation_id, p.last_read_at]))

      // Get conversations with all participants
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, created_at, updated_at')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false })

      if (convError) throw convError
      if (!conversations?.length) return []

      // Get all participants for these conversations
      const { data: allParticipants, error: allPartError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          user_id,
          last_read_at,
          profile:profiles(id, username, full_name, avatar_url)
        `)
        .in('conversation_id', conversationIds)

      if (allPartError) throw allPartError

      // Get last message for each conversation
      const { data: lastMessages, error: msgError } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          image_url,
          gif_url,
          deleted_at,
          created_at
        `)
        .in('conversation_id', conversationIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (msgError) throw msgError

      // Get unread counts
      const unreadCounts = new Map<string, number>()
      for (const convId of conversationIds) {
        const lastRead = lastReadMap.get(convId)
        const count = lastMessages?.filter(
          m => m.conversation_id === convId && 
               m.sender_id !== user.id && 
               new Date(m.created_at) > new Date(lastRead || 0)
        ).length || 0
        unreadCounts.set(convId, count)
      }

      // Build conversation objects
      const result: Conversation[] = conversations.map(conv => {
        const participants = (allParticipants || [])
          .filter(p => p.conversation_id === conv.id)
          .map(p => ({
            user_id: p.user_id,
            last_read_at: p.last_read_at,
            profile: p.profile as any
          }))

        const lastMessage = lastMessages?.find(m => m.conversation_id === conv.id)

        return {
          ...conv,
          participants,
          last_message: lastMessage as Message | undefined,
          unread_count: unreadCounts.get(conv.id) || 0
        }
      })

      return result
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Get messages for a specific conversation
export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return []

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          image_url,
          gif_url,
          deleted_at,
          created_at,
          sender:profiles!sender_id(id, username, full_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get reactions for all messages
      const messageIds = (data || []).map(m => m.id)
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds)
      
      // Transform sender from array to single object and attach reactions
      return (data || []).map(msg => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
        reactions: (reactions || []).filter(r => r.message_id === msg.id)
      })) as Message[]
    },
    enabled: !!conversationId,
  })
}

// Send a message (text, image, or GIF)
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      content, 
      messageType = 'text',
      imageUrl,
      gifUrl 
    }: { 
      conversationId: string
      content: string
      messageType?: 'text' | 'image' | 'gif'
      imageUrl?: string
      gifUrl?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
          image_url: imageUrl || null,
          gif_url: gifUrl || null
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })
}

// Delete a message (soft delete)
export function useDeleteMessage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user.id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })
}

// Add reaction to a message
export function useAddReaction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ messageId, emoji, conversationId }: { messageId: string; emoji: string; conversationId: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          emoji
        }, { onConflict: 'message_id,user_id,emoji' })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] })
    }
  })
}

// Remove reaction from a message
export function useRemoveReaction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ messageId, emoji, conversationId }: { messageId: string; emoji: string; conversationId: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] })
    }
  })
}

// Set typing indicator
export function useTypingIndicator() {
  const { user } = useAuth()

  const setTyping = async (conversationId: string) => {
    if (!user) return

    await supabase
      .from('typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: user.id,
        started_at: new Date().toISOString()
      }, { onConflict: 'conversation_id,user_id' })
  }

  const clearTyping = async (conversationId: string) => {
    if (!user) return

    await supabase
      .from('typing_indicators')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
  }

  return { setTyping, clearTyping }
}

// Subscribe to typing indicators
export function useTypingSubscription(conversationId: string | null) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    if (!conversationId || !user) return

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['typing', conversationId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, user, queryClient])
}

// Get typing users in a conversation
export function useTypingUsers(conversationId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['typing', conversationId],
    queryFn: async () => {
      if (!conversationId) return []

      const { data, error } = await supabase
        .from('typing_indicators')
        .select(`
          user_id,
          started_at,
          profile:profiles!user_id(id, username, full_name)
        `)
        .eq('conversation_id', conversationId)
        .neq('user_id', user?.id || '')
        .gt('started_at', new Date(Date.now() - 10000).toISOString())

      if (error) throw error
      return data || []
    },
    enabled: !!conversationId && !!user,
    refetchInterval: 3000, // Check every 3 seconds
  })
}

// Start or get existing conversation with a user
export function useStartConversation() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('Not authenticated')
      if (otherUserId === user.id) throw new Error('Cannot message yourself')

      // Check if conversation already exists between these two users
      const { data: myConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)

      if (myConversations?.length) {
        const myConvIds = myConversations.map(c => c.conversation_id)
        
        const { data: theirParticipation } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', myConvIds)

        if (theirParticipation?.length) {
          // Existing conversation found
          return theirParticipation[0].conversation_id
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single()

      if (convError) throw convError

      // Add both participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: otherUserId }
        ])

      if (partError) throw partError

      return newConv.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })
}

// Mark conversation as read
export function useMarkAsRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })
}

// Get total unread count
export function useUnreadCount() {
  const { data: conversations } = useConversations()
  
  return conversations?.reduce((sum, conv) => sum + conv.unread_count, 0) || 0
}

// Real-time subscription for messages in a conversation
export function useMessageSubscription(conversationId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE (for soft deletes), DELETE
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          // Invalidate queries to refetch messages
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        () => {
          // Refetch messages when reactions change
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient])
}
