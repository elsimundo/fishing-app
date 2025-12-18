import { Network } from '@capacitor/network'
import { useState, useEffect } from 'react'

interface NetworkStatus {
  isOnline: boolean
  connectionType: string
}

/**
 * Hook to detect network connectivity status using Capacitor Network plugin.
 * Works on both native (iOS/Android) and web platforms.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    // Get initial network status
    Network.getStatus().then(status => {
      setIsOnline(status.connected)
      setConnectionType(status.connectionType)
    }).catch(() => {
      // Fallback for web - use navigator.onLine
      setIsOnline(navigator.onLine)
      setConnectionType('unknown')
    })

    // Listen for network status changes
    const listener = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected)
      setConnectionType(status.connectionType)
    })

    // Web fallback listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      listener.then(l => l.remove())
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, connectionType }
}
