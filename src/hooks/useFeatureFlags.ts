import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type FeatureFlag = 
  | 'feature_freshwater_enabled'
  | 'feature_tackle_shops_enabled'
  | 'feature_clubs_enabled'
  | 'feature_competitions_enabled'
  | 'feature_ai_identifier_enabled'

interface AppSetting {
  id: string
  key: string
  value: boolean
  description: string | null
  updated_at: string
}

// Fetch all feature flags
export function useFeatureFlags() {
  return useQuery<AppSetting[]>({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .like('key', 'feature_%')
        .order('key')

      if (error) throw new Error(error.message)
      
      return (data ?? []).map(row => ({
        ...row,
        value: row.value === true || row.value === 'true',
      }))
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

// Check a single feature flag
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const { data: flags } = useFeatureFlags()
  
  if (!flags) return false
  
  const setting = flags.find(f => f.key === flag)
  return setting?.value ?? false
}

// Hook for checking if freshwater is enabled (commonly used)
export function useFreshwaterEnabled(): boolean {
  return useFeatureFlag('feature_freshwater_enabled')
}

// Admin: Update a feature flag
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, value }: { key: FeatureFlag; value: boolean }) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value: value,
          updated_at: new Date().toISOString(),
        })
        .eq('key', key)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    },
  })
}
