import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Catch, Session, SessionWithCatches } from '../types'
import { calculateSessionStats } from '../lib/sessionStats'

async function fetchSessions(): Promise<SessionWithCatches[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('sessions')
    .select('*, catches(*)')
    .order('started_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const sessions = (data ?? []) as (Session & { catches: Catch[] | null })[]

  return sessions.map((session) => {
    const catches = session.catches ?? []
    const stats = calculateSessionStats(session, catches)
    return { ...session, catches, stats }
  })
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions', 'completed'],
    queryFn: fetchSessions,
  })
}
