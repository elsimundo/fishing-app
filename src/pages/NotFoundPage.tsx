import { useNavigate } from 'react-router-dom'
import { Fish, Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <Fish size={48} className="text-muted-foreground" />
      </div>
      
      <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
      <p className="mb-1 text-lg font-medium text-foreground">Page not found</p>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        Looks like this catch got away. The page you're looking for doesn't exist or has been moved.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          <ArrowLeft size={16} />
          Go back
        </button>
        <button
          type="button"
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-900"
        >
          <Home size={16} />
          Home
        </button>
      </div>
    </div>
  )
}
