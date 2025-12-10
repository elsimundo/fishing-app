import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Trophy, Home, Map, PlusSquare, User } from 'lucide-react'
import { CreatePostModal } from '../post/CreatePostModal'

export function BottomNav() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const NavButton = ({ 
    onClick, 
    icon: Icon, 
    label, 
    active = false,
    filled = false 
  }: { 
    onClick: () => void
    icon: typeof Home
    label: string
    active?: boolean
    filled?: boolean
  }) => (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
    >
      <Icon
        size={22}
        className={active ? 'text-navy-800' : 'text-gray-500'}
        fill={active && filled ? 'currentColor' : 'none'}
      />
      <span
        className={`text-[10px] font-medium ${
          active ? 'text-navy-800' : 'text-gray-500'
        }`}
      >
        {label}
      </span>
    </button>
  )

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
        <div className="flex items-stretch h-14">
          <NavButton
            onClick={() => navigate('/feed')}
            icon={Home}
            label="Feed"
            active={isActive('/feed')}
            filled
          />
          <NavButton
            onClick={() => navigate('/explore')}
            icon={Map}
            label="Explore"
            active={isActive('/explore')}
          />
          <NavButton
            onClick={() => setShowCreateModal(true)}
            icon={PlusSquare}
            label="Post"
            active={showCreateModal}
          />
          <NavButton
            onClick={() => navigate('/challenges')}
            icon={Trophy}
            label="Challenges"
            active={isActive('/challenges')}
          />
          <NavButton
            onClick={() => navigate('/logbook')}
            icon={User}
            label="Logbook"
            active={isActive('/logbook')}
            filled
          />
        </div>
      </nav>

      {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} />}
    </>
  )
}
