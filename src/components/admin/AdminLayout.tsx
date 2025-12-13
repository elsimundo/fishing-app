import { useNavigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import {
  Users,
  Store,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  Loader2,
  Menu,
  X,
  Handshake,
  Trophy,
} from 'lucide-react'
import { useState } from 'react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, isLoading, role } = useAdminAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Redirect if not admin
  if (!isLoading && !isAdmin) {
    navigate('/')
    return null
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-navy-800" />
          <p className="mt-2 text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    )
  }

  const navItems = [
    { to: '/admin', icon: BarChart3, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/businesses', icon: Store, label: 'Businesses' },
    { to: '/admin/lakes', icon: Store, label: 'Lakes' },
    { to: '/admin/challenges', icon: Trophy, label: 'Challenges' },
    { to: '/admin/partners', icon: Handshake, label: 'Partners' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex bg-background">
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between bg-navy-900 px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Shield size={24} className="text-yellow-400" />
          <span className="font-bold text-white">Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 w-64 flex-shrink-0 transform bg-navy-900 text-white transition-transform lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col p-6">
          {/* Logo */}
          <div className="mb-8 hidden items-center gap-2 lg:flex">
            <Shield size={32} className="text-yellow-400" />
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-xs capitalize text-white/60">{role}</p>
            </div>
          </div>

          {/* Spacer for mobile */}
          <div className="mb-4 h-14 lg:hidden" />

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <button
                  key={item.to}
                  onClick={() => {
                    navigate(item.to)
                    setSidebarOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                    isActive
                      ? 'bg-yellow-400 font-semibold text-navy-900'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Back to App */}
          <button
            onClick={() => navigate('/')}
            className="mt-4 flex w-full items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/20"
          >
            <LogOut size={16} />
            <span>Back to App</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:ml-0 lg:pt-0">{children}</main>
    </div>
  )
}
