import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead } from '../../hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import { Link } from 'react-router-dom'

interface NotificationBellProps {
  align?: 'left' | 'right'
}

export function NotificationBell({ align = 'right' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { data: notifications = [] } = useNotifications()
  const { data: unreadCount = 0 } = useUnreadNotificationCount()
  const markAsRead = useMarkNotificationRead()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const recentNotifications = notifications.slice(0, 5)

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead.mutate(notificationId)
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-gray-300 hover:bg-[#334155] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-80 md:w-96 rounded-xl bg-[#243B4A] border border-[#334155] shadow-lg z-50 overflow-hidden`}>
          <div className="p-4 border-b border-[#334155]">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto mb-2 text-gray-500" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#334155]">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                  />
                ))}
              </div>
            )}
          </div>

          {notifications.length > 5 && (
            <div className="p-3 border-t border-[#334155]">
              <Link
                to="/notifications"
                className="block text-center text-sm font-semibold text-[#1BA9A0] hover:text-[#14B8A6]"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
