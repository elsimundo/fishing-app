import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNetworkStatus } from './useNetworkStatus'
import { syncService } from '../lib/syncService'
import { toast } from 'react-hot-toast'

/**
 * Hook that automatically syncs queued offline actions when network reconnects.
 * Should be used once at app root level (e.g., in App.tsx or Layout).
 */
export function useAutoSync() {
  const { isOnline } = useNetworkStatus()
  const wasOffline = useRef(false)
  const isSyncing = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    // Track when we go offline
    if (!isOnline) {
      wasOffline.current = true
      return
    }

    // Just came back online - trigger sync
    if (wasOffline.current && !isSyncing.current) {
      wasOffline.current = false
      isSyncing.current = true

      syncService.syncAll()
        .then(results => {
          if (results.success > 0) {
            toast.success(`Synced ${results.success} offline item${results.success > 1 ? 's' : ''}`)
            
            // Invalidate relevant queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['catches'] })
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
            queryClient.invalidateQueries({ queryKey: ['posts'] })
            queryClient.invalidateQueries({ queryKey: ['feed'] })
          }
          
          if (results.failed > 0) {
            toast.error(`${results.failed} item${results.failed > 1 ? 's' : ''} failed to sync`)
            console.error('Sync errors:', results.errors)
          }
        })
        .catch(error => {
          console.error('Auto-sync failed:', error)
          toast.error('Failed to sync offline data')
        })
        .finally(() => {
          isSyncing.current = false
        })
    }
  }, [isOnline, queryClient])
}
