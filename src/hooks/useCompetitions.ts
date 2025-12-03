import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Competition } from '../types'

export function useActiveCompetitions() {
  return useQuery<Competition[]>({
    queryKey: ['competitions', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitions')
        .select(
          `*,
           competition_stats(participant_count, entry_count),
           creator:profiles!competitions_created_by_fkey(id, username, full_name, avatar_url)`
        )
        .eq('status', 'active')
        .eq('is_public', true)
        .order('starts_at', { ascending: true })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row: any) => ({
        ...(row as Competition),
        participant_count: row.competition_stats?.participant_count ?? 0,
        entry_count: row.competition_stats?.entry_count ?? 0,
        creator: row.creator ?? undefined,
      }))
    },
  })
}

export function useUpcomingCompetitions() {
  return useQuery<Competition[]>({
    queryKey: ['competitions', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitions')
        .select(
          `*,
           competition_stats(participant_count, entry_count),
           creator:profiles!competitions_created_by_fkey(id, username, full_name, avatar_url)`
        )
        .eq('status', 'upcoming')
        .eq('is_public', true)
        .order('starts_at', { ascending: true })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row: any) => ({
        ...(row as Competition),
        participant_count: row.competition_stats?.participant_count ?? 0,
        entry_count: row.competition_stats?.entry_count ?? 0,
        creator: row.creator ?? undefined,
      }))
    },
  })
}

export function useCompetition(competitionId: string) {
  return useQuery<Competition | null>({
    queryKey: ['competition', competitionId],
    queryFn: async () => {
      if (!competitionId) return null

      const { data, error } = await supabase
        .from('competitions')
        .select(
          `*,
           competition_stats(participant_count, entry_count),
           creator:profiles!competitions_created_by_fkey(id, username, full_name, avatar_url),
           winner:profiles!competitions_winner_id_fkey(id, username, full_name, avatar_url)`
        )
        .eq('id', competitionId)
        .single()

      if (error) throw new Error(error.message)

      if (!data) return null

      return {
        ...(data as any as Competition),
        participant_count: (data as any).competition_stats?.participant_count ?? 0,
        entry_count: (data as any).competition_stats?.entry_count ?? 0,
        creator: (data as any).creator ?? undefined,
        winner: (data as any).winner ?? undefined,
      }
    },
    enabled: Boolean(competitionId),
  })
}

export function useMyCompetitions() {
  const { user } = useAuth()

  return useQuery<Competition[]>({
    queryKey: ['competitions', 'my', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('competitions')
        .select('*, competition_stats(participant_count, entry_count)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row: any) => ({
        ...(row as Competition),
        participant_count: row.competition_stats?.participant_count ?? 0,
        entry_count: row.competition_stats?.entry_count ?? 0,
      }))
    },
    enabled: Boolean(user?.id),
  })
}

export function useMyEnteredCompetitions() {
  const { user } = useAuth()

  return useQuery<Competition[]>({
    queryKey: ['competitions', 'entered', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('competition_entries')
        .select(
          `competition:competitions(*, competition_stats(participant_count, entry_count))`
        )
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })

      if (error) throw new Error(error.message)

      const competitions = (data ?? [])
        .map((row: any) => row.competition)
        .filter(Boolean)
        .map((c: any) => ({
          ...(c as Competition),
          participant_count: c.competition_stats?.participant_count ?? 0,
          entry_count: c.competition_stats?.entry_count ?? 0,
        }))

      return competitions
    },
    enabled: Boolean(user?.id),
  })
}

export function useCreateCompetition() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Partial<Competition>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('competitions')
        .insert({
          ...payload,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Competition
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
    },
  })
}

export function useUpdateCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Competition> }) => {
      const { data, error } = await supabase
        .from('competitions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Competition
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
      queryClient.invalidateQueries({ queryKey: ['competition', data.id] })
    },
  })
}

export function useDeleteCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (competitionId: string) => {
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('id', competitionId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
    },
  })
}
