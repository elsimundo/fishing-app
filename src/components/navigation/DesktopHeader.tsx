import { useNavigate } from 'react-router-dom'
import { MessageCircle, Settings } from 'lucide-react'
import { NotificationBell } from '../notifications/NotificationBell'
import { useUnreadCount } from '../../hooks/useMessages'

export function DesktopHeader() {
  const navigate = useNavigate()
  const unreadCount = useUnreadCount()

  return (
    <div className="sticky top-0 z-30 flex items-center justify-end gap-1 border-b border-border bg-background px-4 py-2">
      {/* Messages */}
      <button
        type="button"
        onClick={() => navigate('/messages')}
        className="relative rounded-full p-2 text-foreground hover:bg-muted transition-colors"
        aria-label="Messages"
      >
        <MessageCircle size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications */}
      <div className="[&_button]:text-foreground [&_button:hover]:bg-muted">
        <NotificationBell />
      </div>

      {/* Settings */}
      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="rounded-full p-2 text-foreground hover:bg-muted transition-colors"
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>
    </div>
  )
}
