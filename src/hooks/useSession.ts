import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Catch, Session, SessionWithCatches } from '../types'
import { calculateSessionStats } from '../lib/sessionStats'

async function fetchSession(id: string): Promise<SessionWithCatches> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, catches(*)')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    throw new Error(error?.message ?? 'Session not found')
  }

  const session = data as Session & { catches: Catch[] | null }
  const catches = session.catches ?? []
  const stats = calculateSessionStats(session, catches)

  return { ...session, catches, stats }
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSession(id as string),
    enabled: Boolean(id),
  })
}
