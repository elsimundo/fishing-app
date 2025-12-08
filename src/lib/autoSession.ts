import { supabase } from './supabase'

/**
 * Auto-creates a session for a catch if no session exists.
 * 
 * Logic:
 * 1. Check if user has a recent session (within 4 hours) at a similar location
 * 2. If yes, return that session ID
 * 3. If no, create a new session and return its ID
 */
export async function getOrCreateSessionForCatch({
  userId,
  latitude,
  longitude,
  locationName,
  caughtAt,
  waterType,
}: {
  userId: string
  latitude: number | null
  longitude: number | null
  locationName?: string | null
  caughtAt: string // ISO string
  waterType?: 'saltwater' | 'freshwater' | null
}): Promise<string> {
  const catchTime = new Date(caughtAt)
  const fourHoursAgo = new Date(catchTime.getTime() - 4 * 60 * 60 * 1000)
  const fourHoursLater = new Date(catchTime.getTime() + 4 * 60 * 60 * 1000)

  // Look for an existing session that:
  // 1. Belongs to this user
  // 2. Started within 4 hours of the catch time
  // 3. Is at a similar location (within ~500m)
  const { data: existingSessions } = await supabase
    .from('sessions')
    .select('id, latitude, longitude, started_at, ended_at')
    .eq('user_id', userId)
    .gte('started_at', fourHoursAgo.toISOString())
    .lte('started_at', fourHoursLater.toISOString())
    .order('started_at', { ascending: false })

  if (existingSessions && existingSessions.length > 0 && latitude && longitude) {
    // Check if any session is within ~500m
    for (const session of existingSessions) {
      if (session.latitude && session.longitude) {
        const distance = getDistanceKm(
          latitude,
          longitude,
          session.latitude,
          session.longitude
        )
        // Within 500m = 0.5km
        if (distance < 0.5) {
          return session.id
        }
      }
    }
  }

  // No matching session found, create a new one
  const { data: newSession, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      title: null, // Auto-generated sessions have no title
      location_name: locationName || 'Fishing spot',
      latitude: latitude || 0,
      longitude: longitude || 0,
      water_type: waterType || null,
      is_public: true,
      location_privacy: 'approximate', // Default to approximate for auto-sessions
      started_at: caughtAt, // Session starts at catch time
      ended_at: null, // Leave open
    })
    .select('id')
    .single()

  if (error || !newSession) {
    throw new Error(error?.message || 'Failed to create session')
  }

  return newSession.id
}

/**
 * Calculate distance between two points in km using Haversine formula
 */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
