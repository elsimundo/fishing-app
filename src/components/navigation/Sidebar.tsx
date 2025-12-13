import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Map, Plus, Trophy, User, Settings, LogOut, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { CreatePostModal } from '../post/CreatePostModal'
import { NotificationBell } from '../notifications/NotificationBell'

export function Sidebar() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[275px] flex-col border-r border-[#334155] bg-[#1A2D3D] p-3">
        {/* App title and notifications */}
        <div className="mb-6 px-4 py-3 flex items-center justify-between">
          <img src="/catchi-logo.svg" alt="Catchi" className="h-10 w-auto" />
          <NotificationBell align="left" />
        </div>

        {/* Navigation Items - match bottom nav structure */}
        <nav className="flex flex-1 flex-col gap-1">
          {/* Feed */}
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
              isActive('/feed') ? 'bg-[#243B4A] text-[#1BA9A0] font-bold' : 'text-white font-medium hover:bg-[#243B4A]'
            }`}
          >
            <Home size={28} className={isActive('/feed') ? 'text-[#1BA9A0]' : 'text-white'} />
            <span className="text-base">Feed</span>
          </button>

          {/* Explore */}
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
              isActive('/explore') ? 'bg-[#243B4A] text-[#1BA9A0] font-bold' : 'text-white font-medium hover:bg-[#243B4A]'
            }`}
          >
            <Map size={28} className={isActive('/explore') ? 'text-[#1BA9A0]' : 'text-white'} />
            <span className="text-base">Explore</span>
          </button>

          {/* Challenges */}
          <button
            type="button"
            onClick={() => navigate('/challenges')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
              isActive('/challenges') ? 'bg-[#243B4A] text-[#1BA9A0] font-bold' : 'text-white font-medium hover:bg-[#243B4A]'
            }`}
          >
            <Trophy size={28} className={isActive('/challenges') ? 'text-[#1BA9A0]' : 'text-white'} />
            <span className="text-base">Challenges</span>
          </button>

        <button
          type="button"
          onClick={() => navigate('/logbook')}
          className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
            isActive('/logbook') ? 'bg-[#243B4A] text-[#1BA9A0] font-bold' : 'text-white font-medium hover:bg-[#243B4A]'
          }`}
        >
          <User size={28} className={isActive('/logbook') ? 'text-[#1BA9A0]' : 'text-white'} />
          <div className="flex flex-col items-start">
            <span>Logbook</span>
          </div>
        </button>

        {/* Cast Button */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#1BA9A0] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#14B8A6]"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Cast</span>
        </button>
      </nav>

      {/* User Profile at Bottom */}
      {user && (
        <div className="relative mt-auto">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[#243B4A]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1BA9A0] to-[#14B8A6] text-sm font-semibold text-white">
              {user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-white">
                {user.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs text-gray-400 truncate">{user.email}</div>
            </div>
            <MoreHorizontal size={20} className="text-gray-400" />
          </button>

          {/* Profile Menu Dropdown */}
          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute bottom-full left-4 right-4 mb-2 z-50 rounded-xl bg-[#243B4A] shadow-lg ring-1 ring-[#334155]">
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/settings')
                      setShowProfileMenu(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-white hover:bg-[#1A2D3D]"
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
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
    </>
  )
}
