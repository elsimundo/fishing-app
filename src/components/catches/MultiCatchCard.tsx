import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { Catch } from '../../types'
import { useDeleteCatch } from '../../hooks/useDeleteCatch'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { toast } from 'react-hot-toast'

type MultiCatchCardProps = {
  catches: Catch[]
  showDelete?: boolean
}

export function MultiCatchCard({ catches, showDelete = false }: MultiCatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [deletingCatchId, setDeletingCatchId] = useState<string | null>(null)
  const { mutateAsync: deleteCatch, isPending: isDeleting } = useDeleteCatch()

  if (catches.length === 0) return null

  // Use the first catch for shared info (time, location, photo)
  const primaryCatch = catches[0]
  
  // Group by species and count
  const speciesCounts = catches.reduce<Record<string, number>>((acc, c) => {
    acc[c.species] = (acc[c.species] || 0) + 1
    return acc
  }, {})

  const speciesSummary = Object.entries(speciesCounts)
    .map(([species, count]) => (count > 1 ? `${count}× ${species}` : species))
    .join(', ')

  const handleDelete = async (catchId: string) => {
    try {
      await deleteCatch(catchId)
      toast.success('Catch deleted')
    } catch {
      toast.error('Failed to delete catch')
    }
    setDeletingCatchId(null)
  }

  return (
    <div className="relative">
      <article className="w-full rounded-xl border border-border bg-card shadow-sm">
        {/* Header - clickable to expand */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 text-left hover:bg-muted/50 rounded-t-xl transition-colors"
        >
          <div className="flex gap-3">
            {primaryCatch.photo_url && (
              <img
                src={primaryCatch.photo_url}
                alt="Multi-catch"
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-900/30 px-2 py-0.5 text-[10px] font-medium text-cyan-400 mb-1">
                    🎣 Multi-catch · {catches.length} fish
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {speciesSummary}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                    {new Date(primaryCatch.caught_at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Location */}
              <p className="mt-0.5 text-xs text-muted-foreground">
                📍 {primaryCatch.location_name || 'Unknown location'}
              </p>
            </div>
          </div>
        </button>

        {/* Expanded view - individual fish */}
        {isExpanded && (
          <div className="border-t border-border px-3 pb-3">
            <p className="py-2 text-[11px] font-medium text-muted-foreground">
              Tap a fish to view/edit details
            </p>
            <div className="space-y-2">
              {catches.map((c) => {
                const stats: string[] = []
                if (c.weight_kg != null && c.weight_kg > 0) {
                  stats.push(`${c.weight_kg.toFixed(1)} kg`)
                }
                if (c.length_cm != null && c.length_cm > 0) {
                  stats.push(`${c.length_cm.toFixed(0)} cm`)
                }
                const statsSuffix = stats.length > 0 ? ` · ${stats.join(' · ')}` : ''
                const needsDetails = !c.weight_kg && !c.length_cm

                return (
                  <div key={c.id} className="relative">
                    <Link
                      to={`/catches/${c.id}`}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm">
                        🐟
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {c.species}{statsSuffix}
                        </p>
                        {needsDetails && (
                          <p className="text-[10px] text-amber-500">Tap to add weight/length</p>
                        )}
                      </div>
                    </Link>

                    {/* Delete button for individual fish */}
                    {showDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDeletingCatchId(c.id)
                        }}
                        className="absolute right-1 top-1 rounded-full bg-background p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-red-400"
                        title="Delete this fish"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </article>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingCatchId}
        onCancel={() => setDeletingCatchId(null)}
        onConfirm={() => deletingCatchId && handleDelete(deletingCatchId)}
        title="Delete Catch?"
        message="Delete this fish from the multi-catch? This will also reverse any XP earned."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
      />
    </div>
  )
}
