import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { calculateDistance } from '../utils/distance'
import type { Lake } from '../types'

/**
 * Auto-detect the nearest lake within a given radius
 * Used for smart session creation - suggests a lake if user is at one
 */
export function useNearbyLake(lat: number | null, lng: number | null, maxDistanceKm = 0.5) {
  return useQuery({
    queryKey: ['nearby-lake', lat, lng, maxDistanceKm],
    queryFn: async (): Promise<Lake | null> => {
      if (lat === null || lng === null) return null

      // Query lakes in a bounding box around the point
      const latBuffer = maxDistanceKm / 111 // ~111km per degree latitude
      const lngBuffer = maxDistanceKm / (111 * Math.cos(lat * Math.PI / 180))

      const { data: lakes, error } = await supabase
        .from('lakes')
        .select('*')
        .eq('is_hidden', false)
        .gte('latitude', lat - latBuffer)
        .lte('latitude', lat + latBuffer)
        .gte('longitude', lng - lngBuffer)
        .lte('longitude', lng + lngBuffer)
        .limit(10)

      if (error || !lakes?.length) return null

      // Find the closest lake
      let closestLake: Lake | null = null
      let closestDistance = Infinity

      for (const lake of lakes) {
        const distance = calculateDistance(lat, lng, lake.latitude, lake.longitude)
        if (distance <= maxDistanceKm && distance < closestDistance) {
          closestDistance = distance
          closestLake = { ...lake, distance } as Lake
        }
      }

      return closestLake
    },
    enabled: lat !== null && lng !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
