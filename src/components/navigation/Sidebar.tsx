import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft, ChevronRight, Home, Map, Plus, Trophy, User, Settings, LogOut, MoreHorizontal, Search, MessageCircle } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useBranding } from '../../hooks/useBranding'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useUnreadCount } from '../../hooks/useMessages'
import { useUnreadNotificationCount } from '../../hooks/useNotifications'
import { CreatePostModal } from '../post/CreatePostModal'
import SearchModal from '../search/SearchModal'

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapsed }: SidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const unreadCount = useUnreadCount()
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount()
  const { theme } = useTheme()
  const { logoLight, logoDark, logoIconLight, logoIconDark } = useBranding()

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-background p-3 transition-all duration-200 ${
          collapsed ? 'w-[84px]' : 'w-[275px]'
        }`}
      >
        {/* App logo - full width */}
        <div className={`mb-4 px-4 py-2 ${collapsed ? 'flex justify-center' : ''}`}>
          <img
            src={collapsed ? (theme === 'dark' ? logoIconDark : logoIconLight) : theme === 'dark' ? logoDark : logoLight}
            alt="Catchi"
            className={collapsed ? 'block h-10 w-10 object-contain' : 'block h-9 w-auto max-w-full object-contain object-left'}
          />
        </div>

        <div className={`mb-2 ${collapsed ? 'flex justify-center' : 'flex justify-end px-2'}`}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-1 flex-col gap-1">
          {/* Feed */}
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className={`flex items-center rounded-xl py-3 transition-all ${
              isActive('/feed') ? 'bg-card text-primary font-bold' : 'text-foreground font-medium hover:bg-card'
            } ${collapsed ? 'justify-center px-0' : 'gap-4 px-4'}`}
          >
            <Home size={28} className={isActive('/feed') ? 'text-primary' : 'text-foreground'} />
            {collapsed ? null : <span className="text-base">Feed</span>}
          </button>

          {/* Explore */}
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className={`flex items-center rounded-xl py-3 transition-all ${
              isActive('/explore') ? 'bg-card text-primary font-bold' : 'text-foreground font-medium hover:bg-card'
            } ${collapsed ? 'justify-center px-0' : 'gap-4 px-4'}`}
          >
            <Map size={28} className={isActive('/explore') ? 'text-primary' : 'text-foreground'} />
            {collapsed ? null : <span className="text-base">Explore</span>}
          </button>

          {/* Logbook */}
          <button
            type="button"
            onClick={() => navigate('/logbook')}
            className={`flex items-center rounded-xl py-3 transition-all ${
              isActive('/logbook') ? 'bg-card text-primary font-bold' : 'text-foreground font-medium hover:bg-card'
            } ${collapsed ? 'justify-center px-0' : 'gap-4 px-4'}`}
          >
            <User size={28} className={isActive('/logbook') ? 'text-primary' : 'text-foreground'} />
            {collapsed ? null : <span className="text-base">Logbook</span>}
          </button>

          {/* Challenges */}
          <button
            type="button"
            onClick={() => navigate('/challenges')}
            className={`flex items-center rounded-xl py-3 transition-all ${
              isActive('/challenges') ? 'bg-card text-primary font-bold' : 'text-foreground font-medium hover:bg-card'
            } ${collapsed ? 'justify-center px-0' : 'gap-4 px-4'}`}
          >
            <Trophy size={28} className={isActive('/challenges') ? 'text-primary' : 'text-foreground'} />
            {collapsed ? null : <span className="text-base">Challenges</span>}
          </button>

          {/* Cast Button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className={`mt-2 flex items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-primary/60 ${
              collapsed ? 'px-0 py-3.5' : 'gap-2 px-6 py-3.5'
            }`}
          >
            <Plus size={20} strokeWidth={3} />
            {collapsed ? null : <span>Cast</span>}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className={`flex items-center rounded-xl py-3 transition-all text-foreground font-medium hover:bg-card ${
              collapsed ? 'justify-center px-0' : 'gap-4 px-4'
            }`}
          >
            <Search size={28} className="text-foreground" />
            {collapsed ? null : <span className="text-base">Search</span>}
          </button>

          {/* Messages */}
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className={`relative flex items-center rounded-xl py-3 transition-all ${
              isActive('/messages') ? 'bg-card text-primary font-bold' : 'text-foreground font-medium hover:bg-card'
            } ${collapsed ? 'justify-center px-0' : 'gap-4 px-4'}`}
            aria-label="Messages"
          >
            <MessageCircle size={28} className={isActive('/messages') ? 'text-primary' : 'text-foreground'} />
            {collapsed ? null : <span className="text-base">Messages</span>}
            {unreadCount > 0 ? (
              collapsed ? (
                <span className="absolute right-3 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )
            ) : null}
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className={`relative flex items-center rounded-xl py-3 transition-all ${
              isActive('/notifications') ? 'bg-card text-primary font-bold' : 'text-foreground font-medium hover:bg-card'
            } ${collapsed ? 'justify-center px-0' : 'gap-4 px-4'}`}
            aria-label="Notifications"
          >
            <Bell size={28} className={isActive('/notifications') ? 'text-primary' : 'text-foreground'} />
            {collapsed ? null : <span className="text-base">Notifications</span>}
            {unreadNotifications > 0 ? (
              collapsed ? (
                <span className="absolute right-3 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              ) : (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )
            ) : null}
          </button>
        </nav>

        {/* Settings - above user profile */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className={`flex items-center rounded-xl py-3 transition-all ${
            isActive('/settings') ? 'bg-card text-primary font-bold' : 'text-foreground font-medium hover:bg-card'
          } ${collapsed ? 'justify-center px-0' : 'gap-4 px-4'}`}
          aria-label="Settings"
        >
          <Settings size={28} className={isActive('/settings') ? 'text-primary' : 'text-foreground'} />
          {collapsed ? null : <span className="text-base">Settings</span>}
        </button>

        {/* User Profile at Bottom */}
        {user && (
          <div className="relative mt-auto">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`flex w-full items-center rounded-xl py-3 transition-colors hover:bg-card ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-4'
              }`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground">
                {profile?.username?.[0]?.toUpperCase() || profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              {collapsed ? null : (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {profile?.username || profile?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                  <MoreHorizontal size={20} className="text-muted-foreground flex-shrink-0" />
                </>
              )}
            </button>

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileMenu(false)}
                />
                <div
                  className={`absolute bottom-full mb-2 z-50 rounded-xl bg-card shadow-lg ring-1 ring-border ${
                    collapsed ? 'left-full ml-2 w-56' : 'left-4 right-4'
                  }`}
                >
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut()
                        setShowProfileMenu(false)
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-red-400 hover:bg-red-900/20"
                    >
                      <LogOut size={18} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </aside>
      {showCreateModal ? <CreatePostModal onClose={() => setShowCreateModal(false)} /> : null}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  )
}
