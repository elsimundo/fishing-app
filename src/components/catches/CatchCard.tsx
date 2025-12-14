import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import type { Catch } from '../../types'
import { useDeleteCatch } from '../../hooks/useDeleteCatch'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { toast } from 'react-hot-toast'

type CatchCardProps = {
  item: Catch
  showDelete?: boolean
}

export function CatchCard({ item, showDelete = false }: CatchCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { mutateAsync: deleteCatch, isPending: isDeleting } = useDeleteCatch()

  // Build stats suffix
  const stats: string[] = []
  if (item.weight_kg != null && item.weight_kg > 0) {
    stats.push(`${item.weight_kg.toFixed(1)} kg`)
  }
  if (item.length_cm != null && item.length_cm > 0) {
    stats.push(`${item.length_cm.toFixed(0)} cm`)
  }
  const statsSuffix = stats.length > 0 ? ` · ${stats.join(' · ')}` : ''

  const handleDelete = async () => {
    try {
      await deleteCatch(item.id)
      toast.success('Catch deleted')
    } catch {
      toast.error('Failed to delete catch')
    }
    setShowDeleteConfirm(false)
  }

  return (
    <div className="relative">
      <Link to={`/catches/${item.id}`} className="block">
        <article className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm hover:border-primary/40">
          {/* Top row: badge + date */}
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 font-medium text-muted-foreground">
              🐟 Catch
            </span>
            <span className={showDelete ? 'pr-6' : ''}>
              {new Date(item.caught_at).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Content row: thumbnail + details */}
          <div className="flex gap-3">
            {item.photo_url && (
              <img
                src={item.photo_url}
                alt={item.species}
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              {/* Title: species + stats */}
              <p className="text-sm font-semibold text-foreground">
                {item.species}{statsSuffix}
              </p>

              {/* Location */}
              <p className="mt-0.5 text-xs text-muted-foreground">
                📍 {item.location_name || 'Unknown location'}
              </p>
            </div>
          </div>
        </article>
      </Link>

      {/* Delete button */}
      {showDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowDeleteConfirm(true)
          }}
          className="absolute right-2 top-2 rounded-full bg-background p-1.5 text-muted-foreground shadow-sm hover:bg-muted hover:text-red-400"
          title="Delete catch"
        >
          <Trash2 size={14} />
        </button>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Catch?"
        message={`Delete this ${item.species} catch? This will also reverse any XP earned and may affect challenge progress.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
      />
    </div>
  )
}
