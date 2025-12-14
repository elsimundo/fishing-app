import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session } from '../types'

// How long (in hours) before a session is considered "stale" without activity
const STALE_THRESHOLD_HOURS = 4

// How long (in hours) before we show a warning state (amber)
export const WARNING_THRESHOLD_HOURS = 4

// How long (in hours) before we show a critical state (red)
export const CRITICAL_THRESHOLD_HOURS = 8

// How long (in hours) before we auto-end a session (user ignored all prompts)
const AUTO_END_THRESHOLD_HOURS = 24

export interface ZombieSession extends Session {
  hoursSinceStart: number
  hoursSinceLastActivity: number
  lastActivityAt: string | null
  shouldAutoEnd: boolean // True if session is so stale it should be auto-ended
}

async function fetchZombieSessions(): Promise<ZombieSession[]> {
  const userRes = await supabase.auth.getUser()
  const userId = userRes.data.user?.id

  if (!userId) return []

  // Get all active sessions (ended_at is null)
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })

  if (error || !sessions) return []

  const now = Date.now()
  const zombies: ZombieSession[] = []

  for (const session of sessions) {
    const startTime = new Date(session.started_at).getTime()
    const hoursSinceStart = (now - startTime) / (1000 * 60 * 60)

    // Get the most recent catch for this session
    const { data: latestCatch } = await supabase
      .from('catches')
      .select('caught_at')
      .eq('session_id', session.id)
      .order('caught_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let lastActivityAt: string | null = null
    let hoursSinceLastActivity = hoursSinceStart

    if (latestCatch?.caught_at) {
      lastActivityAt = latestCatch.caught_at
      const lastActivityTime = new Date(latestCatch.caught_at).getTime()
      hoursSinceLastActivity = (now - lastActivityTime) / (1000 * 60 * 60)
    }

    // Session is a zombie if:
    // 1. It's been running for more than threshold hours AND
    // 2. No activity (catches) in the last threshold hours
    if (hoursSinceStart >= STALE_THRESHOLD_HOURS && hoursSinceLastActivity >= STALE_THRESHOLD_HOURS) {
      zombies.push({
        ...session,
        hoursSinceStart,
        hoursSinceLastActivity,
        lastActivityAt,
        shouldAutoEnd: hoursSinceLastActivity >= AUTO_END_THRESHOLD_HOURS,
      } as ZombieSession)
    }
  }

  return zombies
}

export function useZombieSessions() {
  return useQuery({
    queryKey: ['sessions', 'zombies'],
    queryFn: fetchZombieSessions,
    staleTime: 5 * 60 * 1000, // Check every 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refetch every 10 minutes
  })
}

// Check if a specific session is stale
export function isSessionStale(session: Session, lastCatchAt?: string | null): boolean {
  const now = Date.now()
  const startTime = new Date(session.started_at).getTime()
  const hoursSinceStart = (now - startTime) / (1000 * 60 * 60)

  if (hoursSinceStart < STALE_THRESHOLD_HOURS) return false

  if (lastCatchAt) {
    const lastActivityTime = new Date(lastCatchAt).getTime()
    const hoursSinceLastActivity = (now - lastActivityTime) / (1000 * 60 * 60)
    return hoursSinceLastActivity >= STALE_THRESHOLD_HOURS
  }

  return true
}

// Get human-readable time since last activity
export function getTimeSinceActivity(hours: number): string {
  if (hours < 1) return 'less than an hour'
  if (hours < 24) {
    const h = Math.floor(hours)
    return `${h} hour${h === 1 ? '' : 's'}`
  }
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}
