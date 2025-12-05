import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Competition } from '../types'

// Helper function to get participant count for a competition
async function getParticipantCount(competitionId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('get_competition_leaderboard', {
        p_competition_id: competitionId,
      })

    if (error) {
      console.error('Failed to fetch leaderboard for participant count:', error)
      return 0
    }

    return data?.length ?? 0
  } catch (error) {
    console.error('Error getting participant count:', error)
    return 0
  }
}

export function useActiveCompetitions() {
  return useQuery<Competition[]>({
    queryKey: ['competitions', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitions')
        .select(
          `*,
           creator:profiles!competitions_created_by_fkey(id, username, full_name, avatar_url)`
        )
        .eq('status', 'active')
        .eq('is_public', true)
        .order('starts_at', { ascending: true })

      if (error) throw new Error(error.message)

      // Get participant counts for all competitions
      const competitionsWithCounts = await Promise.all(
        (data ?? []).map(async (row: any) => {
          const participantCount = await getParticipantCount(row.id)
          return {
            ...(row as Competition),
            participant_count: participantCount,
            entry_count: participantCount,
            creator: row.creator ?? undefined,
          }
        })
      )

      return competitionsWithCounts
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
           creator:profiles!competitions_created_by_fkey(id, username, full_name, avatar_url)`
        )
        .eq('status', 'upcoming')
        .eq('is_public', true)
        .order('starts_at', { ascending: true })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row: any) => ({
        ...(row as Competition),
        participant_count: 0,
        entry_count: 0,
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
           creator:profiles!competitions_created_by_fkey(id, username, full_name, avatar_url),
           winner:profiles!competitions_winner_id_fkey(id, username, full_name, avatar_url)`
        )
        .eq('id', competitionId)
        .single()

      if (error) throw new Error(error.message)

      if (!data) return null

      // Count participants from the leaderboard (users who have logged catches)
      const { data: leaderboard, error: leaderboardError } = await supabase
        .rpc('get_competition_leaderboard', {
          p_competition_id: competitionId,
        })

      if (leaderboardError) {
        console.error('Failed to fetch leaderboard for participant count:', leaderboardError)
      }

      const participantCount = leaderboard?.length ?? 0

      return {
        ...(data as any as Competition),
        participant_count: participantCount,
        entry_count: participantCount,
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
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      // Get participant counts for all competitions
      const competitionsWithCounts = await Promise.all(
        (data ?? []).map(async (row: any) => {
          const participantCount = await getParticipantCount(row.id)
          return {
            ...(row as Competition),
            participant_count: participantCount,
            entry_count: participantCount,
          }
        })
      )

      return competitionsWithCounts
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
        .select(`competition:competitions(*)`)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })

      if (error) throw new Error(error.message)

      const competitions = (data ?? [])
        .map((row: any) => row.competition)
        .filter(Boolean)

      // Get participant counts for all competitions
      const competitionsWithCounts = await Promise.all(
        competitions.map(async (c: any) => {
          const participantCount = await getParticipantCount(c.id)
          return {
            ...(c as Competition),
            participant_count: participantCount,
            entry_count: participantCount,
          }
        })
      )

      return competitionsWithCounts
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
