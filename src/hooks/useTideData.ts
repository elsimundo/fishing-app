import { useQuery } from '@tanstack/react-query'
import { getTideData, getNearbyTideStations, getTideDataForStation } from '../services/tides'
import type { TideStation } from '../types/tides'

export function useTideData(
  lat: number | null,
  lng: number | null,
  enabled: boolean = true,
  selectedStation?: TideStation | null
) {
  return useQuery({
    queryKey: ['tide-data', lat, lng, selectedStation?.id],
    queryFn: async () => {
      if (lat === null || lng === null) return null
      
      // If a specific station is selected, use that
      if (selectedStation) {
        return await getTideDataForStation(selectedStation, lat, lng)
      }
      
      // Otherwise use the default (nearest) station
      return await getTideData(lat, lng)
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 30 * 60 * 1000, // 30 minutes (tides change slowly)
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export function useNearbyTideStations(
  lat: number | null,
  lng: number | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['nearby-tide-stations', lat, lng],
    queryFn: async () => {
      if (lat === null || lng === null) return []
      return await getNearbyTideStations(lat, lng, 50, 5)
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 60 * 60 * 1000, // 1 hour (stations don't change)
    gcTime: 24 * 60 * 60 * 1000, // 24 hour cache
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
