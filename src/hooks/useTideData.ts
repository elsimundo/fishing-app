import { useQuery } from '@tanstack/react-query'
import { getTideData } from '../services/tides'

export function useTideData(
  lat: number | null,
  lng: number | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tide-data', lat, lng],
    queryFn: async () => {
      if (lat === null || lng === null) return null
      return await getTideData(lat, lng)
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 30 * 60 * 1000, // 30 minutes (tides change slowly)
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
