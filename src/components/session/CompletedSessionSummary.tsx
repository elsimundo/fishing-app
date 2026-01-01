import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Trophy, 
  Fish, 
  Scale, 
  Clock, 
  Target, 
  Share2, 
  Pencil, 
  RotateCcw, 
  Trash2,
  Award,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { format, formatDistanceStrict } from 'date-fns'
import { useWeightFormatter } from '../../hooks/useWeightFormatter'
import { formatCatchSpecies } from '../../utils/catchDisplay'
import { ShareToFeedModal } from './ShareToFeedModal'
import { EditSessionModal } from './EditSessionModal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useUpdateSession } from '../../hooks/useUpdateSession'
import { useDeleteSession } from '../../hooks/useDeleteSession'
import { toast } from 'react-hot-toast'
import type { SessionWithCatches, Catch } from '../../types'

interface CompletedSessionSummaryProps {
  session: SessionWithCatches
  isOwner: boolean
  onRefetch: () => Promise<void>
}

export function CompletedSessionSummary({ session, isOwner, onRefetch }: CompletedSessionSummaryProps) {
  const navigate = useNavigate()
  const { formatWeight } = useWeightFormatter()
  const { mutateAsync: updateSession, isPending: isReopening } = useUpdateSession()
  const { mutateAsync: deleteSession, isPending: isDeleting } = useDeleteSession()
  
  const [showShareModal, setShowShareModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReopenConfirm, setShowReopenConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const catches = session.catches || []
  const totalCatches = catches.length
  const totalWeightKg = catches.reduce((sum, c) => sum + (c.weight_kg || 0), 0)
  const photosCount = catches.filter(c => c.photo_url).length
  
  // Find biggest catch
  const biggestCatch = catches.reduce<Catch | null>((best, c) => {
    if (!c.weight_kg) return best
    if (!best || (best.weight_kg ?? 0) < c.weight_kg) return c
    return best
  }, null)

  // Calculate species breakdown
  const speciesCounts: Record<string, number> = {}
  catches.forEach(c => {
    speciesCounts[c.species] = (speciesCounts[c.species] || 0) + 1
  })
  const uniqueSpecies = Object.keys(speciesCounts).length
  const topSpecies = Object.entries(speciesCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Calculate catch rate
  const durationHours = session.stats?.duration_hours || 0
  const catchRate = durationHours > 0 ? (totalCatches / durationHours).toFixed(1) : '0'

  // Format duration nicely
  const startDate = session.started_at ? new Date(session.started_at) : null
  const endDate = session.ended_at ? new Date(session.ended_at) : null
  const durationStr = startDate && endDate 
    ? formatDistanceStrict(startDate, endDate)
    : `${durationHours.toFixed(1)}h`

  const handleReopen = async () => {
    try {
      await updateSession({ id: session.id, ended_at: undefined })
      toast.success('Session re-opened!')
      await onRefetch()
    } catch {
      toast.error('Failed to re-open session')
    }
    setShowReopenConfirm(false)
  }

  const handleDelete = async () => {
    try {
      await deleteSession(session.id)
      toast.success('Session deleted')
      navigate('/logbook')
    } catch {
      toast.error('Failed to delete session')
    }
    setShowDeleteConfirm(false)
  }

  return (
    <>
      {/* Celebratory Header Banner - Dark shadcn style */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Trophy size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Session Complete</span>
          <Trophy size={18} />
        </div>
        
        <div className="mt-3 text-center">
          <p className="text-3xl font-bold text-foreground">{durationStr}</p>
          <p className="text-sm text-muted-foreground">on the water</p>
        </div>

        {startDate && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={14} />
            <span>{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted px-3 py-2 text-center">
            <p className="text-2xl font-bold text-foreground">{totalCatches}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Catches</p>
          </div>
          <div className="rounded-xl bg-muted px-3 py-2 text-center">
            <p className="text-2xl font-bold text-foreground">
              {totalWeightKg > 0 ? formatWeight(totalWeightKg, { precision: 1 }) : '—'}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
          </div>
          <div className="rounded-xl bg-muted px-3 py-2 text-center">
            <p className="text-2xl font-bold text-foreground">
              {biggestCatch?.weight_kg ? formatWeight(biggestCatch.weight_kg, { precision: 1 }) : '—'}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Biggest</p>
          </div>
        </div>
      </div>

      {/* Session Stats Deep Dive */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp size={16} className="text-primary" />
          Session Statistics
        </h3>
        
        <div className="space-y-3">
          {/* Catch Rate */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Catch Rate</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{catchRate} fish/hour</span>
          </div>

          {/* Photos */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-base">📸</span>
              <span className="text-sm text-muted-foreground">Photos Taken</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{photosCount}</span>
          </div>

          {/* Species Diversity */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Fish size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Species Caught</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{uniqueSpecies}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Time Fishing</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{durationStr}</span>
          </div>
        </div>

        {/* Species Breakdown */}
        {topSpecies.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Species Breakdown
            </p>
            <div className="space-y-2">
              {topSpecies.map(([species, count]) => (
                <div key={species} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{species}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {count} {count === 1 ? 'catch' : 'catches'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Biggest Catch Highlight */}
        {biggestCatch && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Biggest Catch
            </p>
            <button
              type="button"
              onClick={() => navigate(`/catches/${biggestCatch.id}`)}
              className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 text-left transition-colors hover:from-amber-500/20 hover:to-orange-500/20"
            >
              {biggestCatch.photo_url ? (
                <img 
                  src={biggestCatch.photo_url} 
                  alt={biggestCatch.species}
                  className="h-14 w-14 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-amber-500/20 text-2xl">
                  🐟
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {formatCatchSpecies(biggestCatch.species, biggestCatch.quantity)}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {biggestCatch.weight_kg && (
                    <span className="flex items-center gap-1">
                      <Scale size={12} />
                      {formatWeight(biggestCatch.weight_kg, { precision: 2 })}
                    </span>
                  )}
                  {biggestCatch.length_cm && (
                    <span>• {biggestCatch.length_cm} cm</span>
                  )}
                </div>
              </div>
              <Award size={20} className="text-amber-500" />
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isOwner && (
        <div className="mt-4 space-y-3">
          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <Share2 size={18} />
              Share Session
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Pencil size={18} />
              Edit Session
            </button>
          </div>

          {/* Re-open Session */}
          <button
            type="button"
            onClick={() => setShowReopenConfirm(true)}
            disabled={isReopening}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
          >
            <RotateCcw size={18} />
            {isReopening ? 'Re-opening...' : 'Re-open Session'}
          </button>

          {/* Delete Session */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 size={18} />
            {isDeleting ? 'Deleting...' : 'Delete Session'}
          </button>
        </div>
      )}

      {/* Modals */}
      {showShareModal && (
        <ShareToFeedModal
          session={session}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => {
            toast.success('Session shared to your feed!')
            setShowShareModal(false)
          }}
        />
      )}

      {showEditModal && (
        <EditSessionModal
          session={session}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            void onRefetch()
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showReopenConfirm}
        title="Re-open session?"
        message="This will set the session back to active so you can log more catches. You can end it again when you're done."
        confirmLabel={isReopening ? 'Re-opening...' : 'Re-open Session'}
        cancelLabel="Cancel"
        onCancel={() => setShowReopenConfirm(false)}
        onConfirm={handleReopen}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete session?"
        message="This will permanently delete this session and all its catches. This cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Session'}
        cancelLabel="Cancel"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}
