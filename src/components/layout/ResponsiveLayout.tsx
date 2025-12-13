import type { ReactNode } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { BottomNav } from '../navigation/BottomNav'
import { Sidebar } from '../navigation/Sidebar'
import { MobileHeader } from '../navigation/MobileHeader'

interface ResponsiveLayoutProps {
  children: ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <MobileHeader />
        <main className="flex-1 overflow-auto pb-24">{children}</main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[275px] flex-1 max-w-[600px] border-r border-border bg-background">{children}</main>
    </div>
  )
}
