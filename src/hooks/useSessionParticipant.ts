import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { SessionParticipant, LocationPrivacy } from '../types'

export interface UpsertParticipantInput {
  sessionId: string
  spotName?: string | null
  markId?: string | null
  latitude?: number | null
  longitude?: number | null
  waterType?: string | null
  locationPrivacy?: LocationPrivacy | null
}

/**
 * Fetch the current user's participant record for a session.
 * Returns null if not found.
 */
export function useSessionParticipant(sessionId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['session-participant', sessionId, user?.id],
    queryFn: async () => {
      if (!sessionId || !user) return null

      const { data, error } = await supabase
        .from('session_participants')
        .select('*, mark:saved_marks(*)')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return data as SessionParticipant | null
    },
    enabled: Boolean(sessionId && user),
  })
}

/**
 * Upsert the current user's participant record for a session.
 * Creates if not exists, updates if exists.
 */
export function useUpsertSessionParticipant() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpsertParticipantInput) => {
      if (!user) throw new Error('Must be logged in')

      const { data, error } = await supabase
        .from('session_participants')
        .upsert(
          {
            session_id: input.sessionId,
            user_id: user.id,
            spot_name: input.spotName ?? null,
            mark_id: input.markId ?? null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
            water_type: input.waterType ?? null,
            location_privacy: input.locationPrivacy ?? null,
          },
          {
            onConflict: 'session_id,user_id',
          }
        )
        .select()
        .single()

      if (error) throw error
      return data as SessionParticipant
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['session-participant', data.session_id],
      })
    },
  })
}
