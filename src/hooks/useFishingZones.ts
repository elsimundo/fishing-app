import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface FishingZone {
  id: string
  center_lat: number
  center_lng: number
  total_catches: number
  total_sessions: number
  unique_anglers: number
  species_counts: Record<string, number>
  top_species: string | null
  water_type: string | null
  display_name: string | null
  last_activity_at: string | null
}

interface UseFishingZonesOptions {
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  minCatches?: number
  enabled?: boolean
}

export function useFishingZones(options: UseFishingZonesOptions = {}) {
  const { bounds, minCatches = 1, enabled = true } = options

  return useQuery({
    queryKey: ['fishing-zones', bounds, minCatches],
    queryFn: async () => {
      let query = supabase
        .from('fishing_zones')
        .select('*')
        .is('lake_id', null) // Exclude zones that overlap with lakes
        .gte('total_catches', minCatches)
        .order('total_catches', { ascending: false })
        .limit(200)

      // Filter by bounds if provided
      if (bounds) {
        query = query
          .gte('center_lat', bounds.south)
          .lte('center_lat', bounds.north)
          .gte('center_lng', bounds.west)
          .lte('center_lng', bounds.east)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as FishingZone[]
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get zone summary for a specific area (for info panels)
export function useZoneSummary(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ['zone-summary', lat, lng],
    queryFn: async () => {
      if (lat === null || lng === null) return null

      // Calculate grid cell
      const gridLat = Math.floor(lat * 100)
      const gridLng = Math.floor(lng * 100)

      const { data, error } = await supabase
        .from('fishing_zones')
        .select('*')
        .eq('grid_lat', gridLat)
        .eq('grid_lng', gridLng)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
      return data as FishingZone | null
    },
    enabled: lat !== null && lng !== null,
  })
}
