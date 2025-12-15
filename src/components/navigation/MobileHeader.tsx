import { useState } from 'react'
import { Settings, X, MessageCircle, Search } from 'lucide-react'
import { NotificationBell } from '../notifications/NotificationBell'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useUnreadCount } from '../../hooks/useMessages'
import SearchModal from '../search/SearchModal'

export function MobileHeader() {
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const unreadCount = useUnreadCount()

  const handleSignOut = async () => {
    await signOut()
    setShowMenu(false)
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-background px-5 py-3 text-foreground border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/catchi-logo.svg" alt="Catchi" className="h-7 w-auto" />
          </div>
          <div className="flex items-center gap-1">
            {/* Search button */}
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="rounded-full p-2 text-foreground hover:bg-muted transition-colors"
              aria-label="Search"
            >
              <Search size={22} />
            </button>
            {/* Messages button */}
            <button
              type="button"
              onClick={() => navigate('/messages')}
              className="relative rounded-full p-2 text-foreground hover:bg-muted transition-colors"
              aria-label="Messages"
            >
              <MessageCircle size={20} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div className="[&_button]:text-foreground [&_button:hover]:bg-muted">
              <NotificationBell />
            </div>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-2 text-foreground hover:bg-muted transition-colors"
              aria-label="Settings"
            >
              {showMenu ? <X size={20} /> : <Settings size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowMenu(false)}>
          <div 
            className="absolute right-4 top-16 w-48 rounded-xl bg-card shadow-lg ring-1 ring-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  navigate('/logbook')
                  setShowMenu(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted rounded-lg"
              >
                Logbook
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  )
}
