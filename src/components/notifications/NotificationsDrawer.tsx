import { X, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { NotificationItem } from './NotificationItem'
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '../../hooks/useNotifications'

interface NotificationsDrawerProps {
  isOpen: boolean
  onClose: () => void
  leftOffsetPx: number
}

export function NotificationsDrawer({ isOpen, onClose, leftOffsetPx }: NotificationsDrawerProps) {
  const { data: notifications = [], isLoading } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()
  const markRead = useMarkNotificationRead()

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync()
      toast.success('All notifications marked as read')
    } catch (err) {
      toast.error('Failed to mark all as read')
      console.error('Mark all notifications read error:', err)
    }
  }

  const handleItemClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      markRead.mutate(id)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="absolute top-0 h-screen w-[360px] max-w-[85vw] border-r border-border bg-card shadow-xl"
        style={{ left: leftOffsetPx }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-foreground">Notifications</div>
            <div className="text-xs text-muted-foreground">Recent activity</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending || notifications.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-white transition-colors hover:bg-primary/90 disabled:bg-primary/60"
            >
              <Check size={16} />
              <span className="text-xs font-semibold">Mark all</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-112px)] overflow-y-auto">
          {isLoading ? (
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={() => handleItemClick(n.id, n.is_read)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <Link
            to="/notifications"
            className="block rounded-xl px-4 py-2 text-center text-sm font-semibold text-primary hover:bg-muted"
            onClick={onClose}
          >
            View all notifications
          </Link>
        </div>
      </div>
    </div>
  )
}
