import { useEffect, useState } from 'react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { offlineQueue } from '../lib/offlineQueue'
import { WifiOff, Cloud } from 'lucide-react'

/**
 * Offline indicator banner - shows at top of screen when offline.
 * Also displays count of pending items waiting to sync.
 */
export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)

  // Update pending count periodically when offline
  useEffect(() => {
    if (isOnline) {
      setPendingCount(0)
      return
    }

    // Check immediately
    offlineQueue.getPendingCount().then(setPendingCount)

    // Then check every 5 seconds while offline
    const interval = setInterval(() => {
      offlineQueue.getPendingCount().then(setPendingCount)
    }, 5000)

    return () => clearInterval(interval)
  }, [isOnline])

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center py-2 px-4 text-xs font-medium flex items-center justify-center gap-2 safe-area-inset-top">
      <WifiOff size={14} />
      <span>You're offline</span>
      {pendingCount > 0 && (
        <>
          <span className="text-amber-200">•</span>
          <Cloud size={14} />
          <span>{pendingCount} pending</span>
        </>
      )}
    </div>
  )
}

/**
 * Compact offline badge for use in headers/nav
 */
export function OfflineBadge() {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
      <WifiOff size={10} />
      <span>Offline</span>
    </div>
  )
}
