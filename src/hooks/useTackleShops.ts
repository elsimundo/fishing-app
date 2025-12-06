import { useQuery } from '@tanstack/react-query'
import { getTackleShopsInBounds } from '../services/overpass'
import { calculateDistance } from '../utils/distance'

interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

export function useTackleShops(
  bounds: Bounds | null,
  userLocation: { lat: number; lng: number } | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tackle-shops', bounds],
    queryFn: async () => {
      if (!bounds) return null

      const response = await getTackleShopsInBounds(bounds)

      // Calculate distances if user location available
      if (userLocation) {
        response.shops.forEach((shop) => {
          shop.distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            shop.lat,
            shop.lng
          )
        })

        // Sort by distance
        response.shops.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
      }

      return response
    },
    enabled: enabled && bounds !== null,
    staleTime: 30 * 60 * 1000, // 30 minutes (shops don't move!)
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 1,
  })
}
