import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session } from '../types'

async function fetchActiveSession(): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ?? null
}

export function useActiveSession() {
  return useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: fetchActiveSession,
  })
}
