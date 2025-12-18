import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { BottomNav } from '../navigation/BottomNav'
import { Sidebar } from '../navigation/Sidebar'
import { MobileHeader } from '../navigation/MobileHeader'

interface ResponsiveLayoutProps {
  children: ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const location = useLocation()

  // Auto-collapse sidebar on /messages to give more room
  const isMessagesPage = location.pathname.startsWith('/messages')

  const [userCollapsed, setUserCollapsed] = useState(false)

  // Effective collapsed state: user preference OR forced by messages page
  const sidebarCollapsed = isMessagesPage || userCollapsed

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('catchi_sidebar_collapsed')
    setUserCollapsed(raw === 'true')
  }, [])

  const toggleSidebarCollapsed = () => {
    setUserCollapsed((prev: boolean) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('catchi_sidebar_collapsed', String(next))
      }
      return next
    })
  }

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <MobileHeader />
        {/* Spacer for fixed header + safe area */}
        <div 
          className="shrink-0" 
          style={{ height: 'calc(56px + env(safe-area-inset-top))' }} 
        />
        <main className="flex-1 overflow-auto pb-24">{children}</main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />
      <div
        className={`flex-1 border-r border-border bg-background flex flex-col ${
          isMessagesPage ? 'max-w-[900px]' : 'max-w-[600px]'
        }`}
        style={{ marginLeft: sidebarCollapsed ? 84 : 275 }}
      >
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
