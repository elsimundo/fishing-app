import { useQuery } from '@tanstack/react-query'
import { getCompleteWeatherData } from '../services/open-meteo'

export function useWeatherData(lat: number | null, lng: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['weather-data', lat, lng],
    queryFn: async () => {
      if (lat === null || lng === null) return null
      return await getCompleteWeatherData(lat, lng)
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
