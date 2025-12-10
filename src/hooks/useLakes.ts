import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { calculateDistance } from '../utils/distance'
import { fetchLakesFromOSM } from '../services/overpass-lakes'
import { useAuth } from './useAuth'
import type { Lake } from '../types'

interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

interface UseLakesOptions {
  lat?: number | null
  lng?: number | null
  bounds?: Bounds | null
  radiusKm?: number
  enabled?: boolean
}

/**
 * Fetch lakes from both Supabase (claimed/verified) and OSM (discovered)
 */
export function useLakes({ lat, lng, bounds, radiusKm = 50, enabled = true }: UseLakesOptions = {}) {
  return useQuery({
    queryKey: ['lakes', bounds, lat, lng, radiusKm],
    queryFn: async (): Promise<Lake[]> => {
      const allLakes: Lake[] = []
      const seenIds = new Set<string>()

      // 1. Fetch from Supabase (claimed/verified lakes take priority)
      try {
        let query = supabase.from('lakes').select('*').order('name').limit(100)
        
        // Filter out hidden lakes (admin soft-hide)
        query = query.eq('is_hidden', false)
        
        // Filter by bounds if provided
        if (bounds) {
          query = query
            .gte('latitude', bounds.south)
            .lte('latitude', bounds.north)
            .gte('longitude', bounds.west)
            .lte('longitude', bounds.east)
        }

        const { data: supabaseLakes, error } = await query

        if (!error && supabaseLakes) {
          for (const lake of supabaseLakes) {
            seenIds.add(lake.id)
            allLakes.push(lake as Lake)
          }
          console.log(`[useLakes] Found ${supabaseLakes.length} lakes from Supabase`)
        }
      } catch (err) {
        console.error('[useLakes] Supabase error:', err)
      }

      // 2. Fetch from OpenStreetMap if bounds provided
      if (bounds) {
        try {
          const osmLakes = await fetchLakesFromOSM(bounds)
          
          for (const osmLake of osmLakes) {
            // Skip if we already have this lake from Supabase (by checking proximity)
            const isDuplicate = allLakes.some(existing => {
              if (!osmLake.latitude || !osmLake.longitude) return false
              const dist = calculateDistance(
                existing.latitude,
                existing.longitude,
                osmLake.latitude,
                osmLake.longitude
              )
              // Consider duplicate if within 100m and similar name
              return dist < 0.1 && existing.name.toLowerCase().includes(osmLake.name?.toLowerCase().split(' ')[0] || '')
            })

            if (!isDuplicate && osmLake.id) {
              seenIds.add(osmLake.id)
              allLakes.push({
                ...osmLake,
                created_at: osmLake.created_at || new Date().toISOString(),
                updated_at: osmLake.updated_at || new Date().toISOString(),
              } as Lake)
            }
          }
          console.log(`[useLakes] Added ${osmLakes.length} lakes from OSM (after dedup)`)
        } catch (err) {
          console.error('[useLakes] OSM error:', err)
        }
      }

      // 3. Calculate distances if we have a center point
      if (lat != null && lng != null) {
        for (const lake of allLakes) {
          lake.distance = calculateDistance(lat, lng, lake.latitude, lake.longitude)
        }

        // Filter by radius and sort by distance
        return allLakes
          .filter((lake) => lake.distance !== undefined && lake.distance <= radiusKm)
          .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
      }

      return allLakes
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

/**
 * Admin-only mutation to toggle lake visibility (soft-hide)
 * This hides/shows lakes from the Explore map without deleting them
 */
export function useToggleLakeVisibility() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ lakeId, hide }: { lakeId: string; hide: boolean }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('lakes')
        .update({
          is_hidden: hide,
          hidden_at: hide ? new Date().toISOString() : null,
          hidden_by: hide ? user.id : null,
        })
        .eq('id', lakeId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate lakes queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['lakes'] })
      queryClient.invalidateQueries({ queryKey: ['lake'] })
      queryClient.invalidateQueries({ queryKey: ['lake-slug'] })
    },
  })
}
