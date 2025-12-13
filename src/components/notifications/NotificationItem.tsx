import { Link } from 'react-router-dom'
import { Trophy, Check, X, Heart, MessageCircle, UserPlus, Fish, Share2, Users, AlertTriangle, Building2 } from 'lucide-react'
import type { Notification } from '../../hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'

interface NotificationItemProps {
  notification: Notification
  onClick: () => void
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'competition_invite':
    case 'competition_starting_soon':
    case 'competition_winner':
      return <Trophy size={20} className="text-yellow-500" />
    case 'catch_approved':
      return <Check size={20} className="text-green-500" />
    case 'catch_rejected':
      return <X size={20} className="text-red-500" />
    case 'post_like':
      return <Heart size={20} className="text-red-500" />
    case 'post_comment':
      return <MessageCircle size={20} className="text-blue-500" />
    case 'follow':
      return <UserPlus size={20} className="text-purple-500" />
    case 'session_catch':
      return <Fish size={20} className="text-teal-500" />
    case 'share':
      return <Share2 size={20} className="text-cyan-500" />
    case 'lake_team_invite':
    case 'lake_team_removed':
    case 'lake_team_role_changed':
      return <Users size={20} className="text-indigo-500" />
    case 'lake_claim_submitted':
    case 'lake_claim_approved':
    case 'lake_claim_rejected':
      return <Building2 size={20} className="text-emerald-500" />
    case 'lake_problem_reported':
      return <AlertTriangle size={20} className="text-amber-500" />
    default:
      return <Fish size={20} className="text-gray-500" />
  }
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })

  const content = (
    <div
      className={`flex gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.is_read ? 'bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-1">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
        <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
        <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-blue-600" />
        </div>
      )}
    </div>
  )

  // If there's an action URL, wrap in Link
  if (notification.action_url) {
    return (
      <Link to={notification.action_url} className="block">
        {content}
      </Link>
    )
  }

  return content
}
