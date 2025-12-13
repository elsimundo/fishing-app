import { useQuery } from '@tanstack/react-query'
import { getTideData, getTideDataForDate } from '../services/tides'

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

/**
 * Hook to fetch tide data for a specific date range (for future planning)
 */
export function useTideDataForDate(
  lat: number | null,
  lng: number | null,
  startDate: Date | null,
  days: number = 3,
  enabled: boolean = true
) {
  const dateKey = startDate ? startDate.toISOString().split('T')[0] : null
  
  return useQuery({
    queryKey: ['tide-data-date', lat, lng, dateKey, days],
    queryFn: async () => {
      if (lat === null || lng === null || !startDate) return null
      return await getTideDataForDate(lat, lng, startDate, days)
    },
    enabled: enabled && lat !== null && lng !== null && startDate !== null,
    staleTime: 60 * 60 * 1000, // 1 hour (future predictions don't change often)
    gcTime: 2 * 60 * 60 * 1000, // 2 hour cache
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
