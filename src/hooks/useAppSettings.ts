import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AppSetting, SpeciesTierRecord, XPSettingKey } from '../types/appSettings'
import { DEFAULT_XP_VALUES } from '../types/appSettings'

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('key')

      if (error) throw error
      return data as AppSetting[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useAppSetting(key: XPSettingKey) {
  const { data: settings } = useAppSettings()
  
  const setting = settings?.find(s => s.key === key)
  const defaultValue = DEFAULT_XP_VALUES[key]
  
  if (!setting) {
    return defaultValue
  }
  
  // Parse value based on type
  const rawValue = setting.value
  if (typeof rawValue === 'string') {
    if (rawValue === 'true') return true
    if (rawValue === 'false') return false
    const num = Number(rawValue)
    if (!isNaN(num)) return num
  }
  
  return rawValue
}

export function useXPSettings() {
  const { data: settings, isLoading } = useAppSettings()
  
  const getSettingValue = (key: string): number | boolean => {
    const setting = settings?.find(s => s.key === key)
    const defaultValue = DEFAULT_XP_VALUES[key]
    
    if (!setting) return defaultValue
    
    const rawValue = setting.value
    if (typeof rawValue === 'string') {
      if (rawValue === 'true') return true
      if (rawValue === 'false') return false
      const num = Number(rawValue)
      if (!isNaN(num)) return num
    }
    
    return rawValue as number | boolean
  }
  
  return {
    isLoading,
    settings,
    getSettingValue,
    // Convenience accessors
    tierCommon: getSettingValue('xp_tier_common') as number,
    tierStandard: getSettingValue('xp_tier_standard') as number,
    tierTrophy: getSettingValue('xp_tier_trophy') as number,
    tierRare: getSettingValue('xp_tier_rare') as number,
    firstSpeciesBonus: getSettingValue('xp_first_species') as number,
    pbMultiplier: getSettingValue('xp_pb_multiplier') as number,
    releasedBonus: getSettingValue('xp_released_bonus') as number,
    fullDetailsBonus: getSettingValue('xp_full_details_bonus') as number,
    startSessionXP: getSettingValue('xp_start_session') as number,
    referralXP: getSettingValue('xp_referral_signup') as number,
    requirePhoto: getSettingValue('xp_require_photo') as boolean,
    backlogEarns: getSettingValue('xp_backlog_earns') as boolean,
    systemEnabled: getSettingValue('xp_system_enabled') as boolean,
    leaderboardEnabled: getSettingValue('leaderboard_enabled') as boolean,
    challengesEnabled: getSettingValue('challenges_enabled') as boolean,
  }
}

export function useUpdateAppSetting() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | number | boolean }) => {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({
          key,
          value: String(value),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] })
    },
  })
}

export function useSpeciesTiers() {
  return useQuery({
    queryKey: ['species-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('species_tiers')
        .select('*')
        .order('species')

      if (error) throw error
      return data as SpeciesTierRecord[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useUpdateSpeciesTier() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ species, tier, base_xp }: { species: string; tier: string; base_xp: number }) => {
      const { data, error } = await supabase
        .from('species_tiers')
        .upsert({
          species,
          tier,
          base_xp,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['species-tiers'] })
    },
  })
}

export function useSpeciesXP(species: string) {
  const { data: tiers } = useSpeciesTiers()
  const xpSettings = useXPSettings()
  
  // Find tier for this species
  const tierRecord = tiers?.find(t => 
    t.species.toLowerCase() === species.toLowerCase()
  )
  
  if (tierRecord) {
    return tierRecord.base_xp
  }
  
  // Default to standard tier if species not found
  return xpSettings.tierStandard
}
