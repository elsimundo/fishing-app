import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Home, Map, Plus, User } from 'lucide-react'
import { CreatePostModal } from '../post/CreatePostModal'

export function BottomNav() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16">
        {/* Feed */}
        <button
          onClick={() => navigate('/feed')}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors"
        >
          <Home
            size={24}
            className={isActive('/feed') ? 'text-navy-800' : 'text-gray-600'}
            fill={isActive('/feed') ? 'currentColor' : 'none'}
          />
          <span
            className={`text-[10px] font-semibold ${
              isActive('/feed') ? 'text-navy-800' : 'text-gray-600'
            }`}
          >
            Feed
          </span>
        </button>

        {/* Explore */}
        <button
          onClick={() => navigate('/explore')}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors"
        >
          <Map size={24} className={isActive('/explore') ? 'text-navy-800' : 'text-gray-600'} />
          <span
            className={`text-[10px] font-semibold ${
              isActive('/explore') ? 'text-navy-800' : 'text-gray-600'
            }`}
          >
            Explore
          </span>
        </button>

        {/* CENTER POST BUTTON - ELEVATED FAB */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center w-14 h-14 -mt-7 rounded-full bg-blue-600 shadow-lg transition-all hover:bg-blue-700 active:scale-95"
        >
          <Plus size={28} className="text-white" strokeWidth={3} />
        </button>

        {/* Logbook */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors"
        >
          <BookOpen size={24} className={isActive('/dashboard') ? 'text-navy-800' : 'text-gray-600'} />
          <span
            className={`text-[10px] font-semibold ${
              isActive('/dashboard') ? 'text-navy-800' : 'text-gray-600'
            }`}
          >
            Logbook
          </span>
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors"
        >
          <User
            size={24}
            className={isActive('/profile') ? 'text-navy-800' : 'text-gray-600'}
            fill={isActive('/profile') ? 'currentColor' : 'none'}
          />
          <span
            className={`text-[10px] font-semibold ${
              isActive('/profile') ? 'text-navy-800' : 'text-gray-600'
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
