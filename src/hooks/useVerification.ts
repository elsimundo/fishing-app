import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { VerificationLevel } from '../components/catches/VerificationBadge'

interface VerificationResult {
  score: number
  level: VerificationLevel
  details: {
    signals: string[]
    penalties: string[]
  }
}

/**
 * Hook to trigger verification calculation for a catch
 */
export function useVerifyCatch() {
  const queryClient = useQueryClient()

  return useMutation<VerificationResult, Error, string>({
    mutationFn: async (catchId: string) => {
      const { data, error } = await supabase.rpc('calculate_catch_verification', {
        p_catch_id: catchId,
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      return data as VerificationResult
    },
    onSuccess: (_, catchId) => {
      queryClient.invalidateQueries({ queryKey: ['catch', catchId] })
      queryClient.invalidateQueries({ queryKey: ['catches'] })
      queryClient.invalidateQueries({ queryKey: ['my-catches'] })
    },
  })
}

/**
 * Hook for competition hosts to approve/reject catches
 */
export function useApproveCompetitionCatch() {
  const queryClient = useQueryClient()

  return useMutation<
    { success: boolean; approved: boolean; catch_id: string },
    Error,
    { catchId: string; approved: boolean; rejectionReason?: string }
  >({
    mutationFn: async ({ catchId, approved, rejectionReason }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('approve_competition_catch', {
        p_catch_id: catchId,
        p_approved: approved,
        p_approver_id: user.id,
        p_rejection_reason: rejectionReason || null,
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      return data
    },
    onSuccess: (_, { catchId }) => {
      queryClient.invalidateQueries({ queryKey: ['catch', catchId] })
      queryClient.invalidateQueries({ queryKey: ['competition-catches'] })
      queryClient.invalidateQueries({ queryKey: ['competition-leaderboard'] })
    },
  })
}

/**
 * Hook for admins to manually override verification
 */
export function useAdminVerifyCatch() {
  const queryClient = useQueryClient()

  return useMutation<
    { success: boolean; level: string; catch_id: string },
    Error,
    { catchId: string; level: VerificationLevel; reason: string }
  >({
    mutationFn: async ({ catchId, level, reason }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('admin_verify_catch', {
        p_catch_id: catchId,
        p_admin_id: user.id,
        p_level: level,
        p_reason: reason,
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      return data
    },
    onSuccess: (_, { catchId }) => {
      queryClient.invalidateQueries({ queryKey: ['catch', catchId] })
      queryClient.invalidateQueries({ queryKey: ['catches'] })
    },
  })
}

/**
 * Get XP multiplier for a verification level
 */
export function getXPMultiplier(level: VerificationLevel): number {
  const multipliers: Record<VerificationLevel, number> = {
    platinum: 1.0,
    gold: 1.0,
    silver: 1.0,
    bronze: 0.5,
    unverified: 0,
    pending: 0,
    rejected: 0,
  }
  return multipliers[level] ?? 0
}

/**
 * Check if a verification level is eligible for badges
 */
export function isBadgeEligible(level: VerificationLevel): boolean {
  return level === 'gold' || level === 'platinum'
}

/**
 * Check if a verification level is eligible for competitions
 */
export function isCompetitionEligible(level: VerificationLevel): boolean {
  return level === 'platinum'
}
