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

  if (error) {
    // If RLS or permission issues prevent access, show a clearer message
    // rather than a generic "not found".
    if (error.code === 'PGRST301' || error.code === '42501') {
      throw new Error('You no longer have access to this session.')
    }

    throw new Error(error.message)
  }

  if (!data) {
    // No row returned: either the session id is invalid or RLS hides it
    // because the user is no longer a participant.
    throw new Error('Session not found or you no longer have access to this session.')
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
