import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Catch, Session } from '../types'
import type { UserChallenge } from './useGamification'

interface SessionWithCatches extends Session {
  catches: Catch[]
}

export function usePublicUserSessions(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-public-sessions', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('sessions')
        .select('*, catches(*)')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('started_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as SessionWithCatches[]
    },
    enabled: Boolean(userId),
  })
}

export function usePublicUserChallenges(userId: string | undefined) {
  return useQuery<UserChallenge[]>({
    queryKey: ['user-public-challenges', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('user_challenges')
        .select(`
          *,
          challenge:challenges(*)
        `)
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as UserChallenge[]
    },
    enabled: Boolean(userId),
  })
}

export function calculateLifetimeStats(sessions: SessionWithCatches[]) {
  const sessionCount = sessions.length
  const allCatches = sessions.flatMap((s) => s.catches ?? [])
  const catchesCount = allCatches.length

  let totalWeightKg = 0
  let personalBestLabel = '—'
  let topSpeciesLabel = '—'

  // Calculate total weight
  for (const c of allCatches) {
    if (c.weight_kg != null) {
      totalWeightKg += c.weight_kg
    }
  }

  // Personal best: heaviest catch
  const heaviest = allCatches.reduce<Catch | null>((best, c) => {
    if (c.weight_kg == null) return best
    if (!best || (best.weight_kg ?? 0) < c.weight_kg) return c
    return best
  }, null)

  if (heaviest && heaviest.weight_kg != null) {
    const lengthPart =
      heaviest.length_cm != null ? ` · ${heaviest.length_cm.toFixed(0)} cm` : ''
    personalBestLabel = `${heaviest.weight_kg.toFixed(1)} kg · ${heaviest.species}${lengthPart}`
  }

  // Top species by count
  const speciesCounts: Record<string, number> = {}
  for (const c of allCatches) {
    speciesCounts[c.species] = (speciesCounts[c.species] ?? 0) + 1
  }

  const sortedSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])
  if (sortedSpecies.length > 0) {
    const [name, count] = sortedSpecies[0]
    topSpeciesLabel = `${name} (${count})`
  }

  return {
    sessionCount,
    catchesCount,
    totalWeightKg,
    personalBestLabel,
    topSpeciesLabel,
  }
}
