import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session } from '../types'

async function fetchActiveSession(): Promise<Session | null> {
  const userRes = await supabase.auth.getUser()
  const userId = userRes.data.user?.id

  if (!userId) return null

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
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

async function fetchActiveSessions(): Promise<Session[]> {
  const userRes = await supabase.auth.getUser()
  const userId = userRes.data.user?.id

  if (!userId) return []

  // Only get ACTIVE sessions (ended_at is null)
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Session[]
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ['sessions', 'active-all'],
    queryFn: fetchActiveSessions,
  })
}
