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
  const { user, profile, signOut } = useAuth()

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[275px] flex-col border-r border-gray-200 bg-white p-3">
        {/* App title and notifications */}
        <div className="mb-6 px-4 py-3 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fishing App</h1>
          <NotificationBell align="left" />
        </div>

        {/* Navigation Items - match bottom nav structure */}
        <nav className="flex flex-1 flex-col gap-1">
          {/* Feed */}
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
              isActive('/feed') ? 'bg-gray-100 font-bold' : 'font-medium hover:bg-gray-100'
            }`}
          >
            <Home size={28} className="text-gray-900" />
            <span className="text-base">Feed</span>
          </button>

          {/* Explore */}
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
              isActive('/explore') ? 'bg-gray-100 font-bold' : 'font-medium hover:bg-gray-100'
            }`}
          >
            <Map size={28} className="text-gray-900" />
            <span className="text-base">Explore</span>
          </button>

          {/* Challenges */}
          <button
            type="button"
            onClick={() => navigate('/challenges')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
              isActive('/challenges') ? 'bg-gray-100 font-bold' : 'font-medium hover:bg-gray-100'
            }`}
          >
            <Trophy size={28} className="text-gray-900" />
            <span className="text-base">Challenges</span>
          </button>

        <button
          type="button"
          onClick={() => navigate('/logbook')}
          className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
            isActive('/logbook') ? 'bg-gray-100 font-bold' : 'font-medium hover:bg-gray-100'
          }`}
        >
          <User size={28} className="text-gray-900" />
          <div className="flex flex-col items-start">
            <span>Logbook</span>
          </div>
        </button>

        {/* Post Button */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Post</span>
        </button>
      </nav>

      {/* User Profile at Bottom */}
      {user && (
        <div className="relative mt-auto">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-gray-100"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-sm font-semibold text-white">
              {user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-900">
                {user.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs text-gray-600 truncate">{user.email}</div>
            </div>
            <MoreHorizontal size={20} className="text-gray-600" />
          </button>

          {/* Profile Menu Dropdown */}
          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute bottom-full left-4 right-4 mb-2 z-50 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/logbook')
                      setShowProfileMenu(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
