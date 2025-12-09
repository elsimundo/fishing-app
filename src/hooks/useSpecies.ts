import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface SpeciesInfo {
  id: string
  name: string
  display_name: string
  common_names: string[]
  water_type: 'saltwater' | 'freshwater' | 'both'
  family: string | null
  uk_regions: string[]
  habitat: string | null
  peak_months: number[]
  year_round: boolean
  typical_weight_lb: number | null
  specimen_weight_lb: number | null
  uk_record_lb: number | null
  rarity: 'common' | 'medium' | 'rare' | 'very_rare'
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  emoji: string | null
  description: string | null
}

export interface SpeciesActivity {
  total_catches: number
  catches_this_week: number
  unique_anglers: number
  avg_weight: number | null
  best_zone_lat: number | null
  best_zone_lng: number | null
}

export function useAllSpecies() {
  return useQuery({
    queryKey: ['species-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('species_info')
        .select('*')
        .order('display_name')
      if (error) throw error
      return data as SpeciesInfo[]
    },
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useSpeciesByWaterType(waterType: 'saltwater' | 'freshwater') {
  return useQuery({
    queryKey: ['species', waterType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('species_info')
        .select('*')
        .or(`water_type.eq.${waterType},water_type.eq.both`)
        .order('display_name')
      if (error) throw error
      return data as SpeciesInfo[]
    },
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useSpeciesInfo(speciesName: string) {
  return useQuery({
    queryKey: ['species-info', speciesName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('species_info')
        .select('*')
        .ilike('name', speciesName)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data as SpeciesInfo | null
    },
    enabled: !!speciesName,
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useSpeciesActivity(speciesName: string, lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ['species-activity', speciesName, lat, lng],
    queryFn: async () => {
      if (!lat || !lng) return null
      const { data, error } = await supabase.rpc('get_species_activity', {
        p_species: speciesName,
        p_lat: lat,
        p_lng: lng,
        p_radius_km: 50,
        p_days: 30,
      })
      if (error) throw error
      return data?.[0] as SpeciesActivity | null
    },
    enabled: !!speciesName && lat !== null && lng !== null,
    staleTime: 5 * 60 * 1000,
  })
}

export function isInSeason(species: SpeciesInfo): boolean {
  if (species.year_round) return true
  const currentMonth = new Date().getMonth() + 1
  return species.peak_months.includes(currentMonth)
}

export function getSeasonLabel(species: SpeciesInfo): string {
  if (species.year_round) return 'Year-round'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (species.peak_months.length === 0) return 'Unknown'
  const start = months[species.peak_months[0] - 1]
  const end = months[species.peak_months[species.peak_months.length - 1] - 1]
  return `${start} - ${end}`
}
