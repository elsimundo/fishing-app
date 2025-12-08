import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { SavedMark, SavedMarkWaterType, MarkPrivacyLevel, MarkShare } from '../types'
import { toast } from 'react-hot-toast'

export interface CreateMarkInput {
  name: string
  latitude: number
  longitude: number
  water_type?: SavedMarkWaterType
  notes?: string
  privacy_level?: MarkPrivacyLevel
}

export interface UpdateMarkInput {
  id: string
  name?: string
  water_type?: SavedMarkWaterType
  notes?: string
  privacy_level?: MarkPrivacyLevel
}

export interface ShareMarkInput {
  mark_id: string
  shared_with: string // user_id to share with
  can_edit?: boolean
}

export function useSavedMarks() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch user's saved marks
  const {
    data: marks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['saved-marks', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('saved_marks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as SavedMark[]
    },
    enabled: !!user,
  })

  // Create a new mark
  const createMark = useMutation({
    mutationFn: async (input: CreateMarkInput) => {
      if (!user) throw new Error('Must be logged in')

      const { data, error } = await supabase
        .from('saved_marks')
        .insert({
          user_id: user.id,
          name: input.name,
          latitude: input.latitude,
          longitude: input.longitude,
          water_type: input.water_type || 'sea',
          notes: input.notes || null,
          privacy_level: input.privacy_level || 'private',
        })
        .select()
        .single()

      if (error) throw error
      return data as SavedMark
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-marks'] })
      toast.success('Location saved!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save location')
    },
  })

  // Update a mark
  const updateMark = useMutation({
    mutationFn: async (input: UpdateMarkInput) => {
      if (!user) throw new Error('Must be logged in')

      const { id, ...updates } = input
      const { data, error } = await supabase
        .from('saved_marks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data as SavedMark
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-marks'] })
      toast.success('Mark updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update mark')
    },
  })

  // Delete a mark
  const deleteMark = useMutation({
    mutationFn: async (markId: string) => {
      if (!user) throw new Error('Must be logged in')

      const { error } = await supabase
        .from('saved_marks')
        .delete()
        .eq('id', markId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-marks'] })
      toast.success('Mark deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete mark')
    },
  })

  // Share a mark with a friend
  const shareMark = useMutation({
    mutationFn: async (input: ShareMarkInput) => {
      if (!user) throw new Error('Must be logged in')

      const { data, error } = await supabase
        .from('mark_shares')
        .insert({
          mark_id: input.mark_id,
          shared_by: user.id,
          shared_with: input.shared_with,
          can_edit: input.can_edit || false,
        })
        .select()
        .single()

      if (error) throw error
      return data as MarkShare
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-marks'] })
      queryClient.invalidateQueries({ queryKey: ['mark-shares'] })
      toast.success('Mark shared!')
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Already shared with this user')
      } else {
        toast.error(error.message || 'Failed to share mark')
      }
    },
  })

  // Revoke a share
  const revokeMark = useMutation({
    mutationFn: async (shareId: string) => {
      if (!user) throw new Error('Must be logged in')

      const { error } = await supabase
        .from('mark_shares')
        .delete()
        .eq('id', shareId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-marks'] })
      queryClient.invalidateQueries({ queryKey: ['mark-shares'] })
      toast.success('Share revoked')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke share')
    },
  })

  return {
    marks: marks || [],
    isLoading,
    error,
    createMark,
    updateMark,
    deleteMark,
    shareMark,
    revokeMark,
  }
}

// Hook to fetch marks shared with the current user
export function useSharedMarks() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['shared-marks', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Get marks shared with this user
      const { data, error } = await supabase
        .from('mark_shares')
        .select(`
          id,
          mark_id,
          shared_by,
          can_edit,
          created_at,
          mark:saved_marks(
            id,
            user_id,
            name,
            latitude,
            longitude,
            water_type,
            notes,
            privacy_level,
            created_at,
            updated_at
          ),
          shared_by_user:profiles!mark_shares_shared_by_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('shared_with', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Flatten the response - mark is an object, shared_by_user is an array with one item
      return (data || [])
        .filter((share) => share.mark) // Filter out any null marks
        .map((share) => {
          const mark = share.mark as unknown as SavedMark
          const sharedByUser = Array.isArray(share.shared_by_user) 
            ? share.shared_by_user[0] 
            : share.shared_by_user
          return {
            ...mark,
            shared_by_user: sharedByUser,
            can_edit: share.can_edit,
            share_id: share.id,
          }
        })
    },
    enabled: !!user,
  })
}

// Hook to fetch nearby public marks (for discovery)
export function useNearbyPublicMarks(lat: number | null, lng: number | null, radiusKm = 50) {
  return useQuery({
    queryKey: ['public-marks', lat, lng, radiusKm],
    queryFn: async () => {
      if (!lat || !lng) return []

      // Simple bounding box query (approximate)
      const latDelta = radiusKm / 111 // ~111km per degree latitude
      const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))

      const { data, error } = await supabase
        .from('saved_marks')
        .select('*')
        .eq('privacy_level', 'public')
        .gte('latitude', lat - latDelta)
        .lte('latitude', lat + latDelta)
        .gte('longitude', lng - lngDelta)
        .lte('longitude', lng + lngDelta)
        .limit(50)

      if (error) throw error
      return (data || []) as SavedMark[]
    },
    enabled: lat !== null && lng !== null,
  })
}
