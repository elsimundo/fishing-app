import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Catch } from '../types'

async function fetchCatch(id: string): Promise<Catch> {
  const { data, error } = await supabase.from('catches').select('*').eq('id', id).single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Catch not found')
  }

  return data
}

export function useCatch(id: string | undefined) {
  return useQuery({
    queryKey: ['catch', id],
    queryFn: () => fetchCatch(id as string),
    enabled: Boolean(id),
  })
}
