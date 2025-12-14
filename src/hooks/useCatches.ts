import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Catch, WaterType } from '../types'

export type CatchWithWaterType = Catch & {
  water_type?: WaterType | null
}

async function fetchCatches(userId: string, sessionId?: string): Promise<CatchWithWaterType[]> {
  let query = supabase
    .from('catches')
    .select('*, session:sessions(water_type)')
    .eq('user_id', userId) // CRITICAL: Only fetch user's own catches
    .order('caught_at', { ascending: false })

  if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  // Flatten session.water_type to top level
  return (data ?? []).map((c) => ({
    ...c,
    water_type: (c.session as { water_type?: WaterType | null } | null)?.water_type ?? null,
    session: undefined, // Remove nested object
  }))
}

export function useCatches(sessionId?: string) {
  const { user } = useAuth()
  
  const query = useQuery({
    queryKey: ['catches', user?.id, sessionId ?? 'all'],
    queryFn: () => fetchCatches(user!.id, sessionId),
    enabled: !!user,
  })

  return {
    catches: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  }
}
