import { useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '../hooks/useNotifications'
import { NotificationItem } from '../components/notifications/NotificationItem'

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()
  const markRead = useMarkNotificationRead()
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true)
      await markAllRead.mutateAsync()
      toast.success('All notifications marked as read')
    } catch (err) {
      toast.error('Failed to mark all as read')
      console.error('Mark all notifications read error:', err)
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleItemClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      markRead.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-5 py-6">
          <p className="text-sm text-muted-foreground">Loading notifications…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">All your recent activity in one place.</p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll || notifications.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90 disabled:bg-primary/60"
          >
            <Check size={18} />
            <span className="text-sm font-semibold">Mark all read</span>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-5 py-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {notifications.length === 0 ? (
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
      </main>
    </div>
  )
}
