import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Catch, Session, SessionWithCatches } from '../types'
import { calculateSessionStats } from '../lib/sessionStats'

async function mapSessions(data: (Session & { catches: Catch[] | null })[] | null): Promise<SessionWithCatches[]> {
  const sessions = (data ?? []) as (Session & { catches: Catch[] | null })[]

  return sessions.map((session) => {
    const catches = session.catches ?? []
    const stats = calculateSessionStats(session, catches)
    return { ...session, catches, stats }
  })
}

async function fetchMySessions(): Promise<SessionWithCatches[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('sessions')
    .select('*, catches(*)')
    .eq('user_id', userId)
    .order('ended_at', { ascending: true, nullsFirst: true })
    .order('started_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return mapSessions(data as (Session & { catches: Catch[] | null })[] | null)
}

async function fetchPublicSessions(): Promise<SessionWithCatches[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, catches(*)')
    .order('ended_at', { ascending: true, nullsFirst: true })
    .order('started_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return mapSessions(data as (Session & { catches: Catch[] | null })[] | null)
}

// Personal sessions for the current angler (used in dashboard/profile)
export function useMySessions() {
  return useQuery({
    queryKey: ['sessions', 'mine'],
    queryFn: fetchMySessions,
  })
}

// Community sessions for maps/Explore (leveraging RLS to include
// public/general sessions from all anglers)
export function usePublicSessions() {
  return useQuery({
    queryKey: ['sessions', 'public'],
    queryFn: fetchPublicSessions,
  })
}
