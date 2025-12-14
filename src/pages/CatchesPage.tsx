import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { CatchCard } from '../components/catches/CatchCard'
import { useCatches } from '../hooks/useCatches'
import { ArrowLeft, Plus } from 'lucide-react'

export default function CatchesPage() {
  const navigate = useNavigate()
  const { catches, isLoading } = useCatches()

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-foreground">All Catches</h1>
          </div>
          <Link
            to="/catches/new"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus size={16} />
            Log Catch
          </Link>
        </div>

        {/* Catches List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : !catches || catches.length === 0 ? (
          <div className="rounded-xl bg-muted p-8 text-center">
            <p className="text-muted-foreground">No catches logged yet</p>
            <Link
              to="/catches/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus size={16} />
              Log your first catch
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {catches.map((item) => (
              <CatchCard key={item.id} item={item} showDelete />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
