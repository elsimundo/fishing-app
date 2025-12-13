import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Lake } from '../types'
import { toast } from 'react-hot-toast'

export interface SavedLake {
  id: string
  user_id: string
  lake_id: string
  created_at: string
  lake?: Lake
}

export function useSavedLakes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch saved lakes with lake details
  const { data: savedLakes = [], isLoading } = useQuery({
    queryKey: ['saved-lakes', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('saved_lakes')
        .select(`
          id,
          user_id,
          lake_id,
          created_at,
          lake:lakes (
            id,
            name,
            latitude,
            longitude,
            water_type,
            is_verified,
            is_premium,
            claimed_by,
            day_ticket_price,
            has_parking,
            has_toilets,
            has_cafe
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Flatten the lake object
      return (data || []).map((item) => ({
        ...item,
        lake: Array.isArray(item.lake) ? item.lake[0] : item.lake,
      })) as unknown as SavedLake[]
    },
    enabled: !!user,
  })

  // Check if a lake is saved
  const isLakeSaved = (lakeId: string) => {
    return savedLakes.some((sl) => sl.lake_id === lakeId)
  }

  // Save a lake
  const saveLake = useMutation({
    mutationFn: async (lakeId: string) => {
      if (!user) throw new Error('Must be logged in')

      const { error } = await supabase
        .from('saved_lakes')
        .insert({ user_id: user.id, lake_id: lakeId })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lakes'] })
      toast.success('Lake saved to watchlist')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save lake')
    },
  })

  // Unsave a lake
  const unsaveLake = useMutation({
    mutationFn: async (lakeId: string) => {
      if (!user) throw new Error('Must be logged in')

      const { error } = await supabase
        .from('saved_lakes')
        .delete()
        .eq('user_id', user.id)
        .eq('lake_id', lakeId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lakes'] })
      toast.success('Lake removed from watchlist')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove lake')
    },
  })

  // Toggle save state
  const toggleSave = (lakeId: string) => {
    if (isLakeSaved(lakeId)) {
      unsaveLake.mutate(lakeId)
    } else {
      saveLake.mutate(lakeId)
    }
  }

  return {
    savedLakes,
    isLoading,
    isLakeSaved,
    saveLake,
    unsaveLake,
    toggleSave,
    isPending: saveLake.isPending || unsaveLake.isPending,
  }
}
