import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Catch } from '../types'

async function fetchCatches(): Promise<Catch[]> {
  const { data, error } = await supabase
    .from('catches')
    .select('*')
    .order('caught_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export function useCatches() {
  const query = useQuery({
    queryKey: ['catches'],
    queryFn: fetchCatches,
  })

  return {
    catches: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  }
}
