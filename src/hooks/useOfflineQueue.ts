import { useState, useEffect, useCallback } from 'react'
import { offlineQueue } from '../lib/offlineQueue'
import type { QueuedAction } from '../lib/offlineQueue'

/**
 * Hook to access offline queue state reactively.
 * Useful for showing pending sync count in UI.
 */
export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const actions = await offlineQueue.getAll()
      setPendingActions(actions)
      setPendingCount(actions.length)
    } catch (error) {
      console.error('Failed to get offline queue:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    pendingCount,
    pendingActions,
    isLoading,
    hasPending: pendingCount > 0,
    refresh,
  }
}
