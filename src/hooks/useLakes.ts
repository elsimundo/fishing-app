import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { calculateDistance } from '../utils/distance'
import type { Lake } from '../types'

interface UseLakesOptions {
  lat?: number | null
  lng?: number | null
  radiusKm?: number
  enabled?: boolean
}

/**
 * Fetch lakes, optionally filtered by distance from a point
 */
export function useLakes({ lat, lng, radiusKm = 50, enabled = true }: UseLakesOptions = {}) {
  return useQuery({
    queryKey: ['lakes', lat, lng, radiusKm],
    queryFn: async (): Promise<Lake[]> => {
      const { data, error } = await supabase
        .from('lakes')
        .select('*')
        .order('name')
        .limit(100)

      if (error) {
        console.error('[useLakes] Error:', error)
        throw error
      }

      if (!data) return []

      // If we have a center point, calculate distances and filter
      if (lat != null && lng != null) {
        const lakesWithDistance = data.map((lake) => ({
          ...lake,
          distance: calculateDistance(lat, lng, lake.latitude, lake.longitude),
        }))

        return lakesWithDistance
          .filter((lake) => lake.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance)
      }

      return data as Lake[]
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Fetch a single lake by ID
 */
export function useLake(id: string | undefined) {
  return useQuery({
    queryKey: ['lake', id],
    queryFn: async (): Promise<Lake | null> => {
      if (!id) return null

      const { data, error } = await supabase
        .from('lakes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('[useLake] Error:', error)
        return null
      }

      return data as Lake
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Fetch a single lake by slug
 */
export function useLakeBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['lake-slug', slug],
    queryFn: async (): Promise<Lake | null> => {
      if (!slug) return null

      const { data, error } = await supabase
        .from('lakes')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) {
        console.error('[useLakeBySlug] Error:', error)
        return null
      }

      return data as Lake
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  })
}
