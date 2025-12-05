import { useState } from 'react'
import { Settings, X } from 'lucide-react'
import { NotificationBell } from '../notifications/NotificationBell'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export function MobileHeader() {
  const [showMenu, setShowMenu] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    setShowMenu(false)
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-navy-800 px-5 py-3 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Fishing App</h1>
          <div className="flex items-center gap-2">
            <div className="[&_button]:text-white [&_button:hover]:bg-white/10">
              <NotificationBell />
            </div>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-2 text-white hover:bg-white/10 transition-colors"
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
            className="absolute right-4 top-16 w-48 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  navigate('/settings')
                  setShowMenu(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
