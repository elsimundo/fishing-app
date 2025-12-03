import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Calendar, Home, Map, Plus, Trophy, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { CreatePostModal } from '../post/CreatePostModal'

export function Sidebar() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[275px] flex-col border-r border-gray-200 bg-white p-3">
        {/* App title */}
        <div className="mb-6 px-4 py-3">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fishing App</h1>
        </div>

        {/* Navigation Items */}
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

          {/* Sessions */}
          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
              isActive('/sessions') ? 'bg-gray-100 font-bold' : 'font-medium hover:bg-gray-100'
            }`}
          >
            <Calendar size={28} className="text-gray-900" />
            <span className="text-base">Sessions</span>
          </button>

          {/* Discover */}
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
              isActive('/discover') ? 'bg-gray-100 font-bold' : 'font-medium hover:bg-gray-100'
            }`}
          >
            <Map size={28} className="text-gray-900" />
            <span className="text-base">Discover</span>
          </button>

          {/* Compete (coming soon) */}
          <button
            type="button"
            onClick={() => navigate('/compete')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
              isActive('/compete') ? 'bg-gray-100 font-bold' : 'font-medium hover:bg-gray-100'
            }`}
          >
            <Trophy size={28} className="text-gray-900" />
            <span className="text-base">Compete</span>
          </button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
            isActive('/profile') ? 'bg-gray-100 font-bold' : 'font-medium hover:bg-gray-100'
          }`}
        >
          <User size={28} className="text-gray-900" />
          <span className="text-base">Profile</span>
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
      {user && profile && (
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-gray-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-sm font-semibold text-white">
            {profile.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-gray-900">
              {profile.full_name || profile.username || 'User'}
            </div>
            <div className="text-xs text-gray-600">@{profile.username || 'angler'}</div>
          </div>
        </button>
      )}
    </aside>

      {showCreateModal ? <CreatePostModal onClose={() => setShowCreateModal(false)} /> : null}
    </>
  )
}
