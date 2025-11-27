import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Catch } from '../types'

async function fetchCatches(sessionId?: string): Promise<Catch[]> {
  let query = supabase.from('catches').select('*').order('caught_at', { ascending: false })

  if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
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
