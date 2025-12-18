import { useState, useEffect, useRef } from 'react'
import { Settings, X, MessageCircle, Search } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useBranding } from '../../hooks/useBranding'
import { NotificationBell } from '../notifications/NotificationBell'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useUnreadCount } from '../../hooks/useMessages'
import SearchModal from '../search/SearchModal'

export function MobileHeader() {
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const unreadCount = useUnreadCount()
  const { theme } = useTheme()
  const { logoLight, logoDark } = useBranding()

  // Track scroll direction to hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollY.current
      const scrollingUp = currentScrollY < lastScrollY.current
      
      // Only hide if scrolled down more than 50px and scrolling down
      if (scrollingDown && currentScrollY > 50) {
        setIsVisible(false)
      } else if (scrollingUp) {
        setIsVisible(true)
      }
      
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setShowMenu(false)
  }

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-40 bg-background text-foreground border-b border-border transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={theme === 'dark' ? logoDark : logoLight} 
              alt="Catchi" 
              className="h-7 w-auto" 
            />
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
        </div>
      </header>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowMenu(false)}>
          <div 
            className="absolute right-4 w-48 rounded-xl bg-card shadow-lg ring-1 ring-border"
            style={{ top: 'calc(env(safe-area-inset-top) + 56px)' }}
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
