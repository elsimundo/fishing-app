import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Catch, WaterType } from '../types'

export type CatchWithWaterType = Catch & {
  water_type?: WaterType | null
}

async function fetchCatches(sessionId?: string): Promise<CatchWithWaterType[]> {
  let query = supabase
    .from('catches')
    .select('*, session:sessions(water_type)')
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
  const query = useQuery({
    queryKey: ['catches', sessionId ?? 'all'],
    queryFn: () => fetchCatches(sessionId),
  })

  return {
    catches: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  }
}
