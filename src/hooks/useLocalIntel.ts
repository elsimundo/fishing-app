import { useQuery } from '@tanstack/react-query'
import { getLocalIntel } from '../services/local-intel'

export function useLocalIntel(
  lat: number | null,
  lng: number | null,
  radiusKm: number = 25,
  days: number = 30,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['local-intel', lat, lng, radiusKm, days],
    queryFn: async () => {
      if (lat === null || lng === null) return null
      return await getLocalIntel(lat, lng, radiusKm, days)
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minute cache
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
