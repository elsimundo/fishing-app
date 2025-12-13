import { ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface CreatePostModalProps {
  onClose: () => void
}

export function CreatePostModal({ onClose }: CreatePostModalProps) {
  const navigate = useNavigate()

  const options: {
    id: string
    icon: string
    title: string
    subtitle: string
    color: string
    onClick: () => void
  }[] = [
    {
      id: 'start-session',
      icon: '🎣',
      title: 'Start Session',
      subtitle: 'Begin a fishing trip and log catches',
      color: 'bg-blue-900/30',
      onClick: () => {
        onClose()
        navigate('/sessions/new')
      },
    },
    {
      id: 'fish-identifier',
      icon: '🔍',
      title: 'Fish Identifier',
      subtitle: 'Identify a fish with AI and optionally log it',
      color: 'bg-amber-900/30',
      onClick: () => {
        onClose()
        navigate('/identify')
      },
    },
    {
      id: 'log-catch',
      icon: '🐟',
      title: 'Log a Catch',
      subtitle: 'Quick share a single fish',
      color: 'bg-emerald-900/30',
      onClick: () => {
        onClose()
        navigate('/catches/new')
      },
    },
    {
      id: 'share-update',
      icon: '✏️',
      title: 'Share Update',
      subtitle: 'Post a thought, photo or video',
      color: 'bg-purple-900/30',
      onClick: () => {
        onClose()
        navigate('/posts/new')
      },
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden rounded-t-3xl bg-[#243B4A] md:max-w-md md:rounded-2xl border border-[#334155]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="h-1 w-12 rounded-full bg-[#334155]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#334155] px-5 py-4">
          <h2 className="text-xl font-bold text-white">Create Post</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-[#1A2D3D]"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 p-5">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={option.onClick}
              className="group flex w-full items-center gap-4 rounded-xl p-4 transition-colors hover:bg-[#1A2D3D]"
            >
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${option.color}`}
              >
                {option.icon}
              </div>

              <div className="flex-1 text-left">
                <p className="text-base font-semibold text-white">{option.title}</p>
                <p className="mt-0.5 text-sm text-gray-400">{option.subtitle}</p>
              </div>

              <ChevronRight
                size={20}
                className="flex-shrink-0 text-gray-500 transition-colors group-hover:text-[#1BA9A0]"
              />
            </button>
          ))}
        </div>

        <div className="h-6 md:h-4" />
      </div>
    </div>
  )
}
