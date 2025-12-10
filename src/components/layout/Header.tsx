import { useAuth } from '../../hooks/useAuth'
import { Link } from 'react-router-dom'

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          SF
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-primary">Sea Fishing App</p>
          <p className="text-[11px] text-slate-500">Sea fishing logbook & map</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-600">
        <Link to="/sessions" className="text-[11px] text-secondary hover:underline">
          Sessions
        </Link>
        <Link
          to="/logbook"
          className="hidden sm:inline truncate max-w-[140px] text-secondary hover:underline"
          title={user?.email ?? ''}
        >
          {user?.email}
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-white hover:bg-secondary/90"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
