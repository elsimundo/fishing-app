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
      color: 'bg-blue-100 dark:bg-blue-900/30',
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
      color: 'bg-amber-100 dark:bg-amber-900/30',
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
      color: 'bg-emerald-100 dark:bg-emerald-900/30',
      onClick: () => {
        onClose()
        navigate('/catches/new')
      },
    },
    {
      id: 'backlog-catch',
      icon: '📜',
      title: 'Add Backlog Catch',
      subtitle: 'Log an old catch (no XP or badges)',
      color: 'bg-slate-100 dark:bg-slate-800/50',
      onClick: () => {
        onClose()
        navigate('/catches/new', { state: { backlog: true } })
      },
    },
    {
      id: 'compete',
      icon: '🏆',
      title: 'Compete',
      subtitle: 'Join competitions and see leaderboards',
      color: 'bg-rose-100 dark:bg-rose-900/30',
      onClick: () => {
        onClose()
        navigate('/compete')
      },
    },
    {
      id: 'share-update',
      icon: '✏️',
      title: 'Share Update',
      subtitle: 'Post a thought, photo or video',
      color: 'bg-purple-100 dark:bg-purple-900/30',
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
        className="w-full max-h-[85vh] overflow-hidden rounded-t-3xl bg-card md:max-w-md md:rounded-2xl border border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-xl font-bold text-foreground">Create Post</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 p-5 overflow-y-auto flex-1">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={option.onClick}
              className="group flex w-full items-center gap-4 rounded-xl p-4 transition-colors hover:bg-muted"
            >
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${option.color}`}
              >
                {option.icon}
              </div>

              <div className="flex-1 text-left">
                <p className="text-base font-semibold text-foreground">{option.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{option.subtitle}</p>
              </div>

              <ChevronRight
                size={20}
                className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              />
            </button>
          ))}
        </div>

        {/* Safe area padding for mobile home indicator */}
        <div className="h-6 pb-safe md:h-4" />
      </div>
    </div>
  )
}
