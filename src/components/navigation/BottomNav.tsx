import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Home, Map, Plus, User } from 'lucide-react'
import { CreatePostModal } from '../post/CreatePostModal'

export function BottomNav() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path
  
  // Common button classes for large touch targets
  const navButtonClass = "flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[64px] px-3 rounded-xl transition-all active:bg-gray-100"
  
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-20 px-2">
        {/* Feed */}
        <button
          onClick={() => navigate('/feed')}
          className={navButtonClass}
        >
          <Home
            size={28}
            className={isActive('/feed') ? 'text-navy-800' : 'text-gray-500'}
            fill={isActive('/feed') ? 'currentColor' : 'none'}
            strokeWidth={isActive('/feed') ? 2.5 : 2}
          />
          <span
            className={`text-xs font-semibold ${
              isActive('/feed') ? 'text-navy-800' : 'text-gray-500'
            }`}
          >
            Feed
          </span>
        </button>

        {/* Explore */}
        <button
          onClick={() => navigate('/explore')}
          className={navButtonClass}
        >
          <Map 
            size={28} 
            className={isActive('/explore') ? 'text-navy-800' : 'text-gray-500'}
            strokeWidth={isActive('/explore') ? 2.5 : 2}
          />
          <span
            className={`text-xs font-semibold ${
              isActive('/explore') ? 'text-navy-800' : 'text-gray-500'
            }`}
          >
            Explore
          </span>
        </button>

        {/* CENTER POST BUTTON - ELEVATED FAB - Larger for gloves */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center w-16 h-16 -mt-8 rounded-full bg-blue-600 shadow-xl transition-all hover:bg-blue-700 active:scale-95 active:shadow-lg"
        >
          <Plus size={32} className="text-white" strokeWidth={3} />
        </button>

        {/* Logbook */}
        <button
          onClick={() => navigate('/dashboard')}
          className={navButtonClass}
        >
          <BookOpen 
            size={28} 
            className={isActive('/dashboard') ? 'text-navy-800' : 'text-gray-500'}
            strokeWidth={isActive('/dashboard') ? 2.5 : 2}
          />
          <span
            className={`text-xs font-semibold ${
              isActive('/dashboard') ? 'text-navy-800' : 'text-gray-500'
            }`}
          >
            Logbook
          </span>
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate('/profile')}
          className={navButtonClass}
        >
          <User
            size={28}
            className={isActive('/profile') ? 'text-navy-800' : 'text-gray-500'}
            fill={isActive('/profile') ? 'currentColor' : 'none'}
            strokeWidth={isActive('/profile') ? 2.5 : 2}
          />
          <span
            className={`text-xs font-semibold ${
              isActive('/profile') ? 'text-navy-800' : 'text-gray-500'
            }`}
          >
            Profile
          </span>
        </button>
      </div>
    </nav>

      {showCreateModal ? <CreatePostModal onClose={() => setShowCreateModal(false)} /> : null}
    </>
  )
}
