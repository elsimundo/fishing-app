import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useZombieSessions, type ZombieSession } from '../../hooks/useZombieSessions'
import { useUpdateSession } from '../../hooks/useUpdateSession'
import { ZombieSessionModal } from './ZombieSessionModal'

// Key for localStorage to track dismissed sessions
const DISMISSED_ZOMBIES_KEY = 'dismissed_zombie_sessions'

// Key for localStorage to track auto-ended sessions (so we don't try again)
const AUTO_ENDED_KEY = 'auto_ended_sessions'

// How long to wait before showing the modal again for a dismissed session (in hours)
const DISMISS_COOLDOWN_HOURS = 4

interface DismissedSession {
  sessionId: string
  dismissedAt: number // timestamp
}

function getDismissedSessions(): DismissedSession[] {
  try {
    const stored = localStorage.getItem(DISMISSED_ZOMBIES_KEY)
    if (!stored) return []
    return JSON.parse(stored) as DismissedSession[]
  } catch {
    return []
  }
}

function setDismissedSessions(sessions: DismissedSession[]) {
  localStorage.setItem(DISMISSED_ZOMBIES_KEY, JSON.stringify(sessions))
}

function isDismissed(sessionId: string): boolean {
  const dismissed = getDismissedSessions()
  const entry = dismissed.find(d => d.sessionId === sessionId)
  if (!entry) return false
  
  // Check if cooldown has passed
  const hoursSinceDismiss = (Date.now() - entry.dismissedAt) / (1000 * 60 * 60)
  return hoursSinceDismiss < DISMISS_COOLDOWN_HOURS
}

function dismissSession(sessionId: string) {
  const dismissed = getDismissedSessions()
  const filtered = dismissed.filter(d => d.sessionId !== sessionId)
  filtered.push({ sessionId, dismissedAt: Date.now() })
  setDismissedSessions(filtered)
}

function removeFromDismissed(sessionId: string) {
  const dismissed = getDismissedSessions()
  setDismissedSessions(dismissed.filter(d => d.sessionId !== sessionId))
}

function getAutoEndedSessions(): string[] {
  try {
    const stored = localStorage.getItem(AUTO_ENDED_KEY)
    if (!stored) return []
    return JSON.parse(stored) as string[]
  } catch {
    return []
  }
}

function markAsAutoEnded(sessionId: string) {
  const autoEnded = getAutoEndedSessions()
  if (!autoEnded.includes(sessionId)) {
    autoEnded.push(sessionId)
    localStorage.setItem(AUTO_ENDED_KEY, JSON.stringify(autoEnded))
  }
}

function wasAutoEnded(sessionId: string): boolean {
  return getAutoEndedSessions().includes(sessionId)
}

export function ZombieSessionChecker() {
  const queryClient = useQueryClient()
  const { data: zombieSessions, refetch } = useZombieSessions()
  const { mutateAsync: updateSession } = useUpdateSession()
  const [currentZombie, setCurrentZombie] = useState<ZombieSession | null>(null)
  const [hasShownModal, setHasShownModal] = useState(false)
  const hasAutoEnded = useRef(false)

  // Auto-end extremely stale sessions (48+ hours)
  useEffect(() => {
    if (!zombieSessions || hasAutoEnded.current) return

    const sessionsToAutoEnd = zombieSessions.filter(
      z => z.shouldAutoEnd && !wasAutoEnded(z.id)
    )

    if (sessionsToAutoEnd.length > 0) {
      hasAutoEnded.current = true

      // Auto-end each session at its last activity time (or 4 hours after start if no catches)
      Promise.all(
        sessionsToAutoEnd.map(async (session) => {
          const endTime = session.lastActivityAt 
            ? new Date(session.lastActivityAt).toISOString()
            : new Date(new Date(session.started_at).getTime() + 4 * 60 * 60 * 1000).toISOString()

          try {
            await updateSession({ id: session.id, ended_at: endTime })
            markAsAutoEnded(session.id)
            console.log(`Auto-ended stale session: ${session.id}`)
          } catch (error) {
            console.error('Failed to auto-end session:', session.id, error)
          }
        })
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
        refetch()
      })
    }
  }, [zombieSessions, updateSession, queryClient, refetch])

  // Show modal for stale (but not auto-ended) sessions
  useEffect(() => {
    if (zombieSessions && zombieSessions.length > 0 && !hasShownModal) {
      // Find first zombie that: hasn't been dismissed, isn't being auto-ended, wasn't already auto-ended
      const undismissed = zombieSessions.find(
        z => !isDismissed(z.id) && !z.shouldAutoEnd && !wasAutoEnded(z.id)
      )
      if (undismissed) {
        setCurrentZombie(undismissed)
        setHasShownModal(true)
      }
    }
  }, [zombieSessions, hasShownModal])

  const handleClose = () => {
    if (currentZombie) {
      removeFromDismissed(currentZombie.id)
    }
    setCurrentZombie(null)
    setHasShownModal(false)
  }

  const handleDismiss = () => {
    if (currentZombie) {
      dismissSession(currentZombie.id)
    }
    setCurrentZombie(null)
    // Don't reset hasShownModal - we only show once per page load
  }

  if (!currentZombie) return null

  return (
    <ZombieSessionModal
      session={currentZombie}
      onClose={handleClose}
      onDismiss={handleDismiss}
    />
  )
}
