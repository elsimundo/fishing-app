import { useQuery } from '@tanstack/react-query'
import { getTackleShopsInBounds, getClubsInBounds, getChartersInBounds } from '../services/overpass'
import { supabase } from '../lib/supabase'
import { calculateDistance } from '../utils/distance'
import type { TackleShop } from '../types/shops'

interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

export interface BusinessFromDB {
  id: string
  osm_id: string | null
  name: string
  type: 'tackle_shop' | 'club' | 'charter' | 'guide'
  lat: number
  lng: number
  address: string | null
  phone: string | null
  website: string | null
  is_claimed: boolean
  owner_user_id: string | null
  distance?: number
}

/**
 * Upsert OSM results into businesses table and return DB rows
 */
async function syncOsmToBusinesses(
  shops: TackleShop[],
  type: 'tackle_shop' | 'club' | 'charter'
): Promise<BusinessFromDB[]> {
  if (shops.length === 0) return []

  // Upsert each shop into businesses
  const upsertData = shops.map((shop) => ({
    osm_id: shop.id,
    name: shop.name,
    type,
    lat: shop.lat,
    lng: shop.lng,
    address: shop.address || null,
    phone: shop.phone || null,
    website: shop.website || null,
    source: 'osm_sync',
  }))

  // Batch upsert (ignore conflicts on osm_id)
  const { error: upsertError } = await supabase
    .from('businesses')
    .upsert(upsertData, { onConflict: 'osm_id', ignoreDuplicates: false })

  if (upsertError) {
    console.error('[syncOsmToBusinesses] Upsert error:', upsertError)
    // Continue anyway - we'll try to fetch what we can
  }

  // Fetch back from DB (includes is_claimed, owner_user_id, etc.)
  const osmIds = shops.map((s) => s.id)
  const { data: dbRows, error: fetchError } = await supabase
    .from('businesses')
    .select('id, osm_id, name, type, lat, lng, address, phone, website, is_claimed, owner_user_id')
    .in('osm_id', osmIds)

  if (fetchError) {
    console.error('[syncOsmToBusinesses] Fetch error:', fetchError)
    return []
  }

  return (dbRows || []) as BusinessFromDB[]
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

      // 1) Fetch from OSM
      const response = await getTackleShopsInBounds(bounds)

      // 2) Sync to DB and get back enriched rows
      const businesses = await syncOsmToBusinesses(response.shops, 'tackle_shop')

      // 3) Calculate distances if user location available
      if (userLocation) {
        businesses.forEach((biz) => {
          biz.distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            biz.lat,
            biz.lng
          )
        })
        businesses.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
      }

      return {
        shops: businesses,
        fetchedAt: new Date().toISOString(),
        bounds,
      }
    },
    enabled: enabled && bounds !== null,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 1,
  })
}

export function useClubs(
  bounds: Bounds | null,
  userLocation: { lat: number; lng: number } | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['clubs', bounds],
    queryFn: async () => {
      if (!bounds) return null

      const response = await getClubsInBounds(bounds)
      const businesses = await syncOsmToBusinesses(response.shops, 'club')

      if (userLocation) {
        businesses.forEach((biz) => {
          biz.distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            biz.lat,
            biz.lng
          )
        })
        businesses.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
      }

      return {
        clubs: businesses,
        fetchedAt: new Date().toISOString(),
        bounds,
      }
    },
    enabled: enabled && bounds !== null,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  })
}

export function useCharters(
  bounds: Bounds | null,
  userLocation: { lat: number; lng: number } | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['charters', bounds],
    queryFn: async () => {
      if (!bounds) return null

      const response = await getChartersInBounds(bounds)
      const businesses = await syncOsmToBusinesses(response.shops, 'charter')

      if (userLocation) {
        businesses.forEach((biz) => {
          biz.distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            biz.lat,
            biz.lng
          )
        })
        businesses.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
      }

      return {
        charters: businesses,
        fetchedAt: new Date().toISOString(),
        bounds,
      }
    },
    enabled: enabled && bounds !== null,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  })
}
