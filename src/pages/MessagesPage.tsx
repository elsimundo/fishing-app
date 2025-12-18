import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { 
  useConversations, 
  useConversationMessages, 
  useSendMessage, 
  useMarkAsRead,
  useMessageSubscription,
  useDeleteMessage,
  useAddReaction,
  useRemoveReaction,
  useTypingIndicator,
  useTypingSubscription,
  useTypingUsers,
  type Conversation,
  type Message
} from '../hooks/useMessages'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Send, Loader2, MessageCircle, Image, Smile, Trash2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥']

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: conversations, isLoading: loadingConversations } = useConversations()
  const { data: messages, isLoading: loadingMessages } = useConversationMessages(conversationId || null)
  const { mutate: sendMessage, isPending: isSending } = useSendMessage()
  const { mutate: markAsRead } = useMarkAsRead()
  
  const [messageText, setMessageText] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Subscribe to real-time messages and typing
  useMessageSubscription(conversationId || null)
  useTypingSubscription(conversationId || null)
  
  const { data: typingUsers } = useTypingUsers(conversationId || null)
  const { setTyping, clearTyping } = useTypingIndicator()
  const { mutate: deleteMessage } = useDeleteMessage()
  const { mutate: addReaction } = useAddReaction()
  const { mutate: removeReaction } = useRemoveReaction()

  // Get the other participant in the conversation
  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find(p => p.user_id !== user?.id)?.profile
  }

  // Current conversation
  const currentConversation = conversations?.find(c => c.id === conversationId)
  const otherUser = currentConversation ? getOtherParticipant(currentConversation) : null

  // Mark as read when viewing conversation
  useEffect(() => {
    if (conversationId && currentConversation?.unread_count) {
      markAsRead(conversationId)
    }
  }, [conversationId, currentConversation?.unread_count, markAsRead])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!conversationId) return
    
    setTyping(conversationId)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      clearTyping(conversationId)
    }, 3000)
  }, [conversationId, setTyping, clearTyping])

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (conversationId) {
        clearTyping(conversationId)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [conversationId, clearTyping])

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearSelectedImage = () => {
    setSelectedImage(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `message_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = `messages/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('catch-photos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('catch-photos')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSend = async () => {
    if ((!messageText.trim() && !selectedImage) || !conversationId) return
    
    // Clear typing indicator
    clearTyping(conversationId)
    
    try {
      let imageUrl: string | undefined
      
      if (selectedImage) {
        setIsUploading(true)
        imageUrl = await uploadImage(selectedImage)
      }

      sendMessage(
        { 
          conversationId, 
          content: messageText || (imageUrl ? '📷 Image' : ''),
          messageType: imageUrl ? 'image' : 'text',
          imageUrl
        },
        { 
          onSuccess: () => {
            setMessageText('')
            clearSelectedImage()
          },
          onError: () => {
            toast.error('Failed to send message')
          }
        }
      )
    } catch (err) {
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDeleteMessage = (messageId: string) => {
    if (!conversationId) return
    if (!confirm('Delete this message?')) return
    
    deleteMessage(
      { messageId, conversationId },
      {
        onSuccess: () => toast.success('Message deleted'),
        onError: () => toast.error('Failed to delete message')
      }
    )
  }

  const handleReaction = (messageId: string, emoji: string, hasReacted: boolean) => {
    if (!conversationId) return
    
    if (hasReacted) {
      removeReaction({ messageId, emoji, conversationId })
    } else {
      addReaction({ messageId, emoji, conversationId })
    }
    setShowReactionPicker(null)
  }

  const renderMessage = (msg: Message) => {
    const isMe = msg.sender_id === user?.id
    const isDeleted = !!msg.deleted_at
    const myReactions = msg.reactions?.filter(r => r.user_id === user?.id) || []
    
    return (
      <div
        key={msg.id}
        className={`group flex ${isMe ? 'justify-end' : 'justify-start'}`}
      >
        <div className="relative max-w-[75%]">
          {/* Message bubble */}
          <div
            className={`rounded-2xl px-4 py-2 ${
              isDeleted
                ? 'bg-muted text-muted-foreground italic'
                : isMe
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground shadow-sm border border-border'
            }`}
          >
            {isDeleted ? (
              <p className="text-sm">This message was deleted</p>
            ) : (
              <>
                {/* Image */}
                {msg.image_url && (
                  <img
                    src={msg.image_url}
                    alt="Shared image"
                    className="mb-2 max-h-64 rounded-lg object-contain cursor-pointer"
                    onClick={() => window.open(msg.image_url!, '_blank')}
                  />
                )}
                {/* GIF */}
                {msg.gif_url && (
                  <img
                    src={msg.gif_url}
                    alt="GIF"
                    className="mb-2 max-h-48 rounded-lg"
                  />
                )}
                {/* Text content */}
                {msg.content && msg.content !== '📷 Image' && (
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </>
            )}
            <p className={`mt-1 text-[10px] ${isMe ? 'text-white/60' : 'text-muted-foreground'}`}>
              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Reactions display */}
          {!isDeleted && msg.reactions && msg.reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(
                msg.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(msg.id, emoji, myReactions.some(r => r.emoji === emoji))}
                  className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs ${
                    myReactions.some(r => r.emoji === emoji)
                      ? 'bg-primary/20 border border-primary'
                      : 'bg-muted border border-border'
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-muted-foreground">{count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons (show on hover) */}
          {!isDeleted && (
            <div className={`absolute top-0 ${isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
              {/* Reaction picker */}
              <div className="relative">
                <button
                  onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Smile size={16} />
                </button>
                {showReactionPicker === msg.id && (
                  <div className={`absolute bottom-full mb-1 ${isMe ? 'right-0' : 'left-0'} flex gap-1 rounded-full bg-card border border-border shadow-lg p-1`}>
                    {QUICK_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji, myReactions.some(r => r.emoji === emoji))}
                        className="hover:scale-125 transition-transform text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Delete (own messages only) */}
              {isMe && (
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Mobile: show conversation list or chat based on URL
  const showConversation = !!conversationId

  return (
    <Layout>
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col pb-14 md:h-screen md:pb-0 bg-background">
        {/* Header - only show on mobile or when in conversation */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          {showConversation ? (
            <>
              <button
                onClick={() => navigate('/messages')}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-background"
              >
                <ArrowLeft size={20} />
              </button>
              {otherUser && (
                <button
                  onClick={() => {
                    if (otherUser.username) {
                      navigate(`/${otherUser.username}`)
                    } else {
                      navigate(`/profile/${otherUser.id}`)
                    }
                  }}
                  className="flex items-center gap-3"
                >
                  {otherUser.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.username}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      {otherUser.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-semibold text-foreground">
                      {otherUser.full_name || otherUser.username}
                    </p>
                    <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
                  </div>
                </button>
              )}
            </>
          ) : (
            <h1 className="text-lg font-bold text-foreground">Messages</h1>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversation List - hidden on mobile when viewing a conversation */}
          <div className={`w-full flex-shrink-0 border-r border-border bg-card md:w-80 ${showConversation ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
            {/* Desktop list header */}
            <div className="hidden border-b border-border px-4 py-3 md:block">
              <h1 className="text-lg font-bold text-foreground">Messages</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !conversations?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle size={48} className="mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start a conversation from someone's profile
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map(conv => {
                  const other = getOtherParticipant(conv)
                  if (!other) return null

                  return (
                    <button
                      key={conv.id}
                      onClick={() => navigate(`/messages/${conv.id}`)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background ${
                        conv.id === conversationId ? 'bg-muted' : ''
                      }`}
                    >
                      {other.avatar_url ? (
                        <img
                          src={other.avatar_url}
                          alt={other.username}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                          {other.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`truncate font-semibold ${conv.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {other.full_name || other.username}
                          </p>
                          {conv.last_message && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`truncate text-sm ${conv.unread_count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                            {conv.last_message?.content || 'No messages yet'}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            </div>
          </div>

          {/* Message Thread */}
          <div className={`flex flex-1 flex-col bg-background ${!showConversation ? 'hidden md:flex' : ''}`}>
            {!conversationId ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <MessageCircle size={48} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop conversation header */}
                {otherUser && (
                  <div className="hidden border-b border-border bg-card px-4 py-3 md:block">
                    <button
                      onClick={() => navigate(`/profile/${otherUser.id}`)}
                      className="flex items-center gap-3"
                    >
                      {otherUser.avatar_url ? (
                        <img
                          src={otherUser.avatar_url}
                          alt={otherUser.username}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                          {otherUser.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-semibold text-foreground">
                          {otherUser.full_name || otherUser.username}
                        </p>
                        <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
                      </div>
                    </button>
                  </div>
                )}
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
                  {loadingMessages ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : !messages?.length ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map(msg => renderMessage(msg))}
                      
                      {/* Typing indicator */}
                      {typingUsers && typingUsers.length > 0 && (
                        <div className="flex justify-start">
                          <div className="bg-card text-muted-foreground shadow-sm border border-border rounded-2xl px-4 py-2">
                            <div className="flex items-center gap-1">
                              <span className="text-sm">
                                {(typingUsers[0] as any).profile?.username || 'Someone'} is typing
                              </span>
                              <span className="flex gap-0.5">
                                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

              </>
            )}
          </div>
        </div>

        {/* Message Input - Fixed above bottom nav */}
        {conversationId && (
          <div className="fixed bottom-14 left-0 right-0 border-t border-border bg-card p-3 md:static md:bottom-auto">
            {/* Image preview */}
            {imagePreview && (
              <div className="relative mb-2 inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-20 rounded-lg object-cover"
                />
                <button
                  onClick={clearSelectedImage}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div className="flex items-end gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {/* Image button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <Image size={20} />
              </button>
              
              <textarea
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value)
                  handleTyping()
                }}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                rows={1}
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSend}
                disabled={(!messageText.trim() && !selectedImage) || isSending || isUploading}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-primary/60"
              >
                {isSending || isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
