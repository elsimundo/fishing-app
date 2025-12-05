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
      color: 'bg-blue-100',
      onClick: () => {
        onClose()
        navigate('/sessions/new')
      },
    },
    {
      id: 'log-catch',
      icon: '🐟',
      title: 'Log a Catch',
      subtitle: 'Quick share a single fish',
      color: 'bg-emerald-100',
      onClick: () => {
        onClose()
        navigate('/catches/new')
      },
    },
    {
      id: 'share-photo',
      icon: '📸',
      title: 'Share Photo',
      subtitle: 'Post a moment from the water',
      color: 'bg-purple-100',
      onClick: () => {
        onClose()
        navigate('/posts/new')
      },
    },
    {
      id: 'enter-competition',
      icon: '🏆',
      title: 'Enter Competition',
      subtitle: 'Join or browse fishing competitions',
      color: 'bg-yellow-100',
      onClick: () => {
        onClose()
        navigate('/compete')
      },
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden rounded-t-3xl bg-white md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="h-1 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-xl font-bold text-gray-900">Create Post</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-3 transition-colors hover:bg-gray-100 active:bg-gray-200 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 p-5">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={option.onClick}
              className="group flex w-full items-center gap-4 rounded-2xl p-5 transition-all hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] min-h-[80px] border-2 border-gray-100"
            >
              <div
                className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-3xl ${option.color}`}
              >
                {option.icon}
              </div>

              <div className="flex-1 text-left">
                <p className="text-lg font-bold text-gray-900">{option.title}</p>
                <p className="mt-1 text-sm text-gray-600">{option.subtitle}</p>
              </div>

              <ChevronRight
                size={24}
                className="flex-shrink-0 text-gray-400 transition-colors group-hover:text-gray-600"
              />
            </button>
          ))}
        </div>

        <div className="h-8 md:h-6" />
      </div>
    </div>
  )
}
