import type { ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { BottomNav } from '@/components/navigation/BottomNav'
import { Sidebar } from '@/components/navigation/Sidebar'
import { MobileHeader } from '@/components/navigation/MobileHeader'

interface ResponsiveLayoutProps {
  children: ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <MobileHeader />
        <main className="flex-1 overflow-auto pb-20">{children}</main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-[275px] flex-1 max-w-[600px] border-r border-gray-200 bg-white">{children}</main>
    </div>
  )
}
