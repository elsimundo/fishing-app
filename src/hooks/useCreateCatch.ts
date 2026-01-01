import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Catch } from '../types'
import { offlineQueue } from '../lib/offlineQueue'
import type { OfflinePhoto } from '../lib/offlineQueue'
import { useNetworkStatus } from './useNetworkStatus'
import { toast } from 'react-hot-toast'
import { offlinePhotoStorage } from '../lib/offlinePhotoStorage'

export interface CreateCatchInput {
  user_id: string
  species: string
  caught_at: string
  location_name: string
  latitude: number | null
  longitude: number | null
  weight_kg: number | null
  length_cm: number | null
  bait: string | null
  rig: string | null
  fishing_style: string | null
  photo_url: string | null
  notes: string | null
  session_id?: string
  mark_id?: string | null
  is_public?: boolean
  hide_exact_location?: boolean
  weather_temp?: number | null
  weather_condition?: string | null
  wind_speed?: number | null
  moon_phase?: string | null
  species_id?: string | null
  region?: string | null
  returned?: boolean
  photo_exif_latitude?: number | null
  photo_exif_longitude?: number | null
  photo_exif_timestamp?: string | null
  photo_camera_make?: string | null
  photo_camera_model?: string | null
  country_code?: string | null
  peg_swim?: string | null
  is_backlog?: boolean
  multi_catch_group_id?: string | null
  fish_health_issue?: boolean
  fish_health_type?: string | null
  fish_health_notes?: string | null
  treatment_applied?: boolean
  treatment_notes?: string | null
  logged_by_user_id?: string | null
  quantity?: number
  photoFile?: File | null
}

interface CreateCatchResult {
  data: Catch | null
  isOffline: boolean
  tempId?: string
}

/**
 * Hook for creating catches with offline support.
 * When offline, catches are queued and synced when back online.
 */
export function useCreateCatch() {
  const { isOnline } = useNetworkStatus()
  const queryClient = useQueryClient()

  return useMutation<CreateCatchResult, Error, CreateCatchInput>({
    mutationFn: async (input: CreateCatchInput): Promise<CreateCatchResult> => {
      // OFFLINE: Queue the catch for later sync
      if (!isOnline) {
        const tempId = `temp_${crypto.randomUUID()}`
        
        // Handle photo if present
        let offlinePhoto: OfflinePhoto | undefined
        if (input.photoFile) {
          try {
            offlinePhoto = await offlinePhotoStorage.savePhoto(input.photoFile)
          } catch (error) {
            console.error('Failed to save photo offline:', error)
            toast.error('Could not save photo offline')
          }
        }

        // Remove photoFile from payload (not serializable)
        const { photoFile, ...payloadWithoutFile } = input
        
        await offlineQueue.add({
          type: 'create_catch',
          payload: payloadWithoutFile as unknown as Record<string, unknown>,
          offlinePhoto,
        })

        toast('Catch saved offline - will sync when connected', {
          icon: '📡',
          duration: 3000,
        })

        // Return optimistic data with temp ID
        return {
          data: {
            ...input,
            id: tempId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as Catch,
          isOffline: true,
          tempId,
        }
      }

      // ONLINE: Insert directly to Supabase
      const { data, error } = await supabase
        .from('catches')
        .insert(input)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        data: data as Catch,
        isOffline: false,
      }
    },
    onSuccess: (result) => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['catches'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['my-catches'] })
      
      if (result.data?.session_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['session', result.data.session_id] 
        })
      }
    },
  })
}

/**
 * Hook for updating catches with offline support.
 */
export function useUpdateCatch() {
  const { isOnline } = useNetworkStatus()
  const queryClient = useQueryClient()

  return useMutation<CreateCatchResult, Error, { id: string; updates: Partial<CreateCatchInput> }>({
    mutationFn: async ({ id, updates }): Promise<CreateCatchResult> => {
      // OFFLINE: Queue the update for later sync
      if (!isOnline) {
        await offlineQueue.add({
          type: 'update_catch',
          payload: { id, ...updates } as unknown as Record<string, unknown>,
        })

        toast('Update saved offline - will sync when connected', {
          icon: '📡',
          duration: 3000,
        })

        return {
          data: { id, ...updates } as unknown as Catch,
          isOffline: true,
        }
      }

      // ONLINE: Update directly in Supabase
      const { data, error } = await supabase
        .from('catches')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        data: data as Catch,
        isOffline: false,
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['catches'] })
      queryClient.invalidateQueries({ queryKey: ['my-catches'] })
      
      if (result.data?.id) {
        queryClient.invalidateQueries({ 
          queryKey: ['catch', result.data.id] 
        })
      }
    },
  })
}

/**
 * Hook for deleting catches with offline support.
 */
export function useDeleteCatch() {
  const { isOnline } = useNetworkStatus()
  const queryClient = useQueryClient()

  return useMutation<{ isOffline: boolean }, Error, string>({
    mutationFn: async (catchId: string) => {
      // OFFLINE: Queue the delete for later sync
      if (!isOnline) {
        await offlineQueue.add({
          type: 'delete_catch',
          payload: { id: catchId },
        })

        toast('Delete saved offline - will sync when connected', {
          icon: '📡',
          duration: 3000,
        })

        return { isOffline: true }
      }

      // ONLINE: Delete directly from Supabase
      const { error } = await supabase
        .from('catches')
        .delete()
        .eq('id', catchId)

      if (error) {
        throw new Error(error.message)
      }

      return { isOffline: false }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catches'] })
      queryClient.invalidateQueries({ queryKey: ['my-catches'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
