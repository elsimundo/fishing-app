import type { ReactNode } from 'react'
import { OfflineIndicator } from '../OfflineIndicator'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <OfflineIndicator />
      {children}
    </div>
  )
}
