import { useQuery } from '@tanstack/react-query'
import { getLocalIntel } from '../services/local-intel'
import type { FishingPreference } from '../types'

export function useLocalIntel(
  lat: number | null,
  lng: number | null,
  radiusKm: number = 25,
  days: number = 30,
  enabled: boolean = true,
  waterPreference?: FishingPreference | null
) {
  return useQuery({
    queryKey: ['local-intel', lat, lng, radiusKm, days, waterPreference],
    queryFn: async () => {
      if (lat === null || lng === null) return null
      return await getLocalIntel(lat, lng, radiusKm, days, waterPreference)
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minute cache
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
