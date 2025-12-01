import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Map, Plus, Trophy, User } from 'lucide-react'

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe">
      <div className="flex h-16 items-center justify-around">
        {/* Feed */}
        <button
          type="button"
          onClick={() => navigate('/feed')}
          className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
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
          type="button"
          onClick={() => navigate('/explore')}
          className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
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

        {/* Post (Center FAB) */}
        <button
          type="button"
          onClick={() => navigate('/sessions/new')}
          className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-navy-800 shadow-lg transition-colors hover:bg-navy-900"
        >
          <Plus size={28} className="text-white" strokeWidth={3} />
        </button>

        {/* Compete */}
        <button
          type="button"
          onClick={() => navigate('/compete')}
          className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
        >
          <Trophy size={24} className={isActive('/compete') ? 'text-navy-800' : 'text-gray-600'} />
          <span
            className={`text-[10px] font-semibold ${
              isActive('/compete') ? 'text-navy-800' : 'text-gray-600'
            }`}
          >
            Compete
          </span>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
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
  )
}
