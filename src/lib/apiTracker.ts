import { supabase } from './supabase'

export type ApiName = 
  | 'mapbox_geocoding'
  | 'mapbox_tiles'
  | 'mapbox_directions'
  | 'open_meteo_weather'
  | 'open_meteo_marine'
  | 'worldtides'
  | 'noaa_tides'
  | 'environment_agency_tides'
  | 'openstreetmap'
  | 'other'

interface TrackApiCallOptions {
  apiName: ApiName
  endpoint?: string
  metadata?: Record<string, unknown>
}

/**
 * Track an API call for usage monitoring.
 * This is fire-and-forget - errors are logged but don't block the caller.
 */
export async function trackApiCall({ apiName, endpoint, metadata }: TrackApiCallOptions): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase.from('api_usage').insert({
      api_name: apiName,
      endpoint: endpoint || null,
      user_id: user?.id || null,
      metadata: metadata || {},
    })
  } catch (error) {
    // Silent fail - don't break the app for tracking
    console.warn('[API Tracker] Failed to log API call:', error)
  }
}

/**
 * Batch track multiple API calls at once.
 */
export async function trackApiCallsBatch(calls: TrackApiCallOptions[]): Promise<void> {
  if (calls.length === 0) return
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    const rows = calls.map(call => ({
      api_name: call.apiName,
      endpoint: call.endpoint || null,
      user_id: user?.id || null,
      metadata: call.metadata || {},
    }))
    
    await supabase.from('api_usage').insert(rows)
  } catch (error) {
    console.warn('[API Tracker] Failed to log batch API calls:', error)
  }
}
