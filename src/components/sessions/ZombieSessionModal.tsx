import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Clock, AlertTriangle, Play, Square, Calendar } from 'lucide-react'
import { useUpdateSession } from '../../hooks/useUpdateSession'
import { useQueryClient } from '@tanstack/react-query'
import type { ZombieSession } from '../../hooks/useZombieSessions'
import { getTimeSinceActivity } from '../../hooks/useZombieSessions'

interface ZombieSessionModalProps {
  session: ZombieSession
  onClose: () => void
  onDismiss: () => void
}

export function ZombieSessionModal({ session, onClose, onDismiss }: ZombieSessionModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mutateAsync: updateSession, isPending } = useUpdateSession()
  
  const [showCustomEndTime, setShowCustomEndTime] = useState(false)
  const [customEndDate, setCustomEndDate] = useState('')
  const [customEndTime, setCustomEndTime] = useState('')

  const title = session.title || session.location_name || 'Fishing Session'
  const timeSinceActivity = getTimeSinceActivity(session.hoursSinceLastActivity)

  const handleContinue = () => {
    // User wants to keep fishing - just dismiss the modal
    onDismiss()
    navigate(`/sessions/${session.id}`)
  }

  const handleEndNow = async () => {
    try {
      await updateSession({
        id: session.id,
        ended_at: new Date().toISOString(),
      })
      await queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onClose()
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  const handleEndAtCustomTime = async () => {
    if (!customEndDate || !customEndTime) return

    try {
      const endDateTime = new Date(`${customEndDate}T${customEndTime}`)
      
      // Validate: end time must be after start time and not in the future
      const startTime = new Date(session.started_at)
      const now = new Date()
      
      if (endDateTime < startTime) {
        alert('End time cannot be before the session started')
        return
      }
      
      if (endDateTime > now) {
        alert('End time cannot be in the future')
        return
      }

      await updateSession({
        id: session.id,
        ended_at: endDateTime.toISOString(),
      })
      await queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onClose()
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  // Set default custom end time to last activity or a reasonable time
  const getDefaultEndTime = () => {
    const defaultTime = session.lastActivityAt 
      ? new Date(session.lastActivityAt)
      : new Date(new Date(session.started_at).getTime() + 4 * 60 * 60 * 1000) // 4 hours after start
    
    return {
      date: defaultTime.toISOString().split('T')[0],
      time: defaultTime.toTimeString().slice(0, 5),
    }
  }

  const handleShowCustomTime = () => {
    const defaults = getDefaultEndTime()
    setCustomEndDate(defaults.date)
    setCustomEndTime(defaults.time)
    setShowCustomEndTime(true)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Session Still Running</h2>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4 rounded-lg bg-amber-900/30 border border-amber-500/40 p-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock size={16} />
              <span className="text-sm font-medium">
                No activity for {timeSinceActivity}
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-300">
              This session has been running without any logged catches. Did you forget to end it?
            </p>
          </div>

          {!showCustomEndTime ? (
            <div className="space-y-2">
              {/* Continue Session */}
              <button
                type="button"
                onClick={handleContinue}
                disabled={isPending}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-900/30">
                  <Play size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Continue Session</p>
                  <p className="text-xs text-muted-foreground">I'm still fishing, keep it running</p>
                </div>
              </button>

              {/* End Now */}
              <button
                type="button"
                onClick={handleEndNow}
                disabled={isPending}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/30">
                  <Square size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">End Session Now</p>
                  <p className="text-xs text-muted-foreground">End the session at the current time</p>
                </div>
              </button>

              {/* Custom End Time */}
              <button
                type="button"
                onClick={handleShowCustomTime}
                disabled={isPending}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900/30">
                  <Calendar size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Enter End Time</p>
                  <p className="text-xs text-muted-foreground">I finished earlier, let me set the correct time</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">When did you actually finish fishing?</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    min={session.started_at.split('T')[0]}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomEndTime(false)}
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleEndAtCustomTime}
                  disabled={isPending || !customEndDate || !customEndTime}
                  className="flex-1 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
                >
                  {isPending ? 'Saving...' : 'End Session'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-3">
          <p className="text-center text-xs text-muted-foreground">
            Sessions without activity for 8+ hours will show this reminder
          </p>
        </div>
      </div>
    </div>
  )
}
