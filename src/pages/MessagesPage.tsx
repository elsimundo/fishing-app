import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { 
  useConversations, 
  useConversationMessages, 
  useSendMessage, 
  useMarkAsRead,
  useMessageSubscription,
  type Conversation 
} from '../hooks/useMessages'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, Send, Loader2, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: conversations, isLoading: loadingConversations } = useConversations()
  const { data: messages, isLoading: loadingMessages } = useConversationMessages(conversationId || null)
  const { mutate: sendMessage, isPending: isSending } = useSendMessage()
  const { mutate: markAsRead } = useMarkAsRead()
  
  const [messageText, setMessageText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Subscribe to real-time messages
  useMessageSubscription(conversationId || null)

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

  const handleSend = () => {
    if (!messageText.trim() || !conversationId) return
    
    sendMessage(
      { conversationId, content: messageText },
      { onSuccess: () => setMessageText('') }
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Mobile: show conversation list or chat based on URL
  const showConversation = !!conversationId

  return (
    <Layout>
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col pb-14 md:h-screen md:pb-0">
        {/* Header - only show on mobile or when in conversation */}
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          {showConversation ? (
            <>
              <button
                onClick={() => navigate('/messages')}
                className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeft size={20} />
              </button>
              {otherUser && (
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 font-bold text-white">
                      {otherUser.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">
                      {otherUser.full_name || otherUser.username}
                    </p>
                    <p className="text-xs text-gray-500">@{otherUser.username}</p>
                  </div>
                </button>
              )}
            </>
          ) : (
            <h1 className="text-lg font-bold text-gray-900">Messages</h1>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversation List - hidden on mobile when viewing a conversation */}
          <div className={`w-full flex-shrink-0 border-r border-gray-200 bg-white md:w-80 ${showConversation ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
            {/* Desktop list header */}
            <div className="hidden border-b border-gray-200 px-4 py-3 md:block">
              <h1 className="text-lg font-bold text-gray-900">Messages</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-navy-800" />
              </div>
            ) : !conversations?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle size={48} className="mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">No messages yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  Start a conversation from someone's profile
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map(conv => {
                  const other = getOtherParticipant(conv)
                  if (!other) return null

                  return (
                    <button
                      key={conv.id}
                      onClick={() => navigate(`/messages/${conv.id}`)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                        conv.id === conversationId ? 'bg-navy-50' : ''
                      }`}
                    >
                      {other.avatar_url ? (
                        <img
                          src={other.avatar_url}
                          alt={other.username}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 font-bold text-white">
                          {other.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`truncate font-semibold ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {other.full_name || other.username}
                          </p>
                          {conv.last_message && (
                            <span className="text-[10px] text-gray-400">
                              {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`truncate text-sm ${conv.unread_count > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                            {conv.last_message?.content || 'No messages yet'}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-navy-800 px-1.5 text-[10px] font-bold text-white">
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
          <div className={`flex flex-1 flex-col bg-gray-50 ${!showConversation ? 'hidden md:flex' : ''}`}>
            {!conversationId ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop conversation header */}
                {otherUser && (
                  <div className="hidden border-b border-gray-200 bg-white px-4 py-3 md:block">
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 font-bold text-white">
                          {otherUser.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">
                          {otherUser.full_name || otherUser.username}
                        </p>
                        <p className="text-xs text-gray-500">@{otherUser.username}</p>
                      </div>
                    </button>
                  </div>
                )}
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
                  {loadingMessages ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-navy-800" />
                    </div>
                  ) : !messages?.length ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-gray-500">No messages yet</p>
                      <p className="mt-1 text-xs text-gray-400">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map(msg => {
                        const isMe = msg.sender_id === user?.id
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                isMe
                                  ? 'bg-navy-800 text-white'
                                  : 'bg-white text-gray-900 shadow-sm'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`mt-1 text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
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
          <div className="fixed bottom-14 left-0 right-0 border-t border-gray-200 bg-white p-3 md:static md:bottom-auto">
            <div className="flex items-end gap-2">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                rows={1}
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-navy-800"
              />
              <button
                onClick={handleSend}
                disabled={!messageText.trim() || isSending}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white transition-colors hover:bg-navy-900 disabled:bg-gray-300"
              >
                {isSending ? (
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
