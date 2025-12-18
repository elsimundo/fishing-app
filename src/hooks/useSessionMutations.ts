import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useNetworkStatus } from './useNetworkStatus'
import { offlineQueue } from '../lib/offlineQueue'
import { toast } from 'react-hot-toast'
import type { Session, WaterType, LocationPrivacy } from '../types'

export interface CreateSessionInput {
  user_id: string
  title?: string | null
  location_name: string
  latitude: number
  longitude: number
  water_type?: WaterType | null
  is_public?: boolean
  location_privacy?: LocationPrivacy
  started_at: string
  session_notes?: string | null
  cover_photo_url?: string | null
  weather_temp?: number | null
  weather_condition?: string | null
  wind_speed?: number | null
  tide_state?: string | null
  moon_phase?: string | null
  lake_id?: string | null
  mark_id?: string | null
  competition_id?: string | null
}

export interface UpdateSessionInput {
  title?: string | null
  location_name?: string
  session_notes?: string | null
  cover_photo_url?: string | null
  ended_at?: string | null
  is_public?: boolean
}

interface SessionResult {
  data: Session | null
  isOffline: boolean
  tempId?: string
}

/**
 * Hook for creating sessions with offline support.
 */
export function useCreateSession() {
  const { isOnline } = useNetworkStatus()
  const queryClient = useQueryClient()

  return useMutation<SessionResult, Error, CreateSessionInput>({
    mutationFn: async (input: CreateSessionInput): Promise<SessionResult> => {
      // OFFLINE: Queue the session for later sync
      if (!isOnline) {
        const tempId = `temp_${crypto.randomUUID()}`
        
        await offlineQueue.add({
          type: 'create_session',
          payload: { ...input, id: tempId } as unknown as Record<string, unknown>,
        })

        toast('Session saved offline - will sync when connected', {
          icon: '📡',
          duration: 3000,
        })

        return {
          data: {
            ...input,
            id: tempId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ended_at: null,
            paused_at: null,
          } as unknown as Session,
          isOffline: true,
          tempId,
        }
      }

      // ONLINE: Insert directly to Supabase
      const { data, error } = await supabase
        .from('sessions')
        .insert(input)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        data: data as Session,
        isOffline: false,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['active-session'] })
    },
  })
}

/**
 * Hook for updating sessions with offline support.
 */
export function useUpdateSession() {
  const { isOnline } = useNetworkStatus()
  const queryClient = useQueryClient()

  return useMutation<SessionResult, Error, { id: string; updates: UpdateSessionInput }>({
    mutationFn: async ({ id, updates }): Promise<SessionResult> => {
      // OFFLINE: Queue the update for later sync
      if (!isOnline) {
        await offlineQueue.add({
          type: 'update_session',
          payload: { id, ...updates } as unknown as Record<string, unknown>,
        })

        toast('Update saved offline - will sync when connected', {
          icon: '📡',
          duration: 3000,
        })

        return {
          data: { id, ...updates } as unknown as Session,
          isOffline: true,
        }
      }

      // ONLINE: Update directly in Supabase
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        data: data as Session,
        isOffline: false,
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['session', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['active-session'] })
    },
  })
}

/**
 * Hook for ending sessions with offline support.
 * This is a common action that needs to work offline.
 */
export function useEndSession() {
  const { isOnline } = useNetworkStatus()
  const queryClient = useQueryClient()

  return useMutation<{ isOffline: boolean }, Error, string>({
    mutationFn: async (sessionId: string) => {
      const endedAt = new Date().toISOString()

      // OFFLINE: Queue the end session for later sync
      if (!isOnline) {
        await offlineQueue.add({
          type: 'end_session',
          payload: { id: sessionId, ended_at: endedAt },
        })

        toast('Session ended offline - will sync when connected', {
          icon: '📡',
          duration: 3000,
        })

        return { isOffline: true }
      }

      // ONLINE: Update directly in Supabase
      const { error } = await supabase
        .from('sessions')
        .update({ ended_at: endedAt })
        .eq('id', sessionId)

      if (error) {
        throw new Error(error.message)
      }

      return { isOffline: false }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['active-session'] })
    },
  })
}
