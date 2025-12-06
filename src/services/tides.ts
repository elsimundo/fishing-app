import type { TideData } from '../types/tides'
import { getNOAATideData } from './noaa-tides'
import { getWorldTidesData, isWorldTidesConfigured } from './worldtides'

/**
 * Check if location is in US coastal waters (rough approximation)
 */
function isUSWaters(lat: number, lng: number): boolean {
  // Continental US coasts
  const continentalUS = lat >= 24 && lat <= 50 && lng >= -130 && lng <= -65

  // Hawaii
  const hawaii = lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154

  // Alaska
  const alaska = lat >= 51 && lat <= 72 && lng >= -180 && lng <= -129

  // Puerto Rico / US Virgin Islands
  const caribbean = lat >= 17 && lat <= 19 && lng >= -68 && lng <= -64

  return continentalUS || hawaii || alaska || caribbean
}

/**
 * Get tide data for a location
 * Tries NOAA first for US waters, falls back to WorldTides for global coverage
 */
export async function getTideData(
  lat: number,
  lng: number
): Promise<TideData | null> {
  // Try NOAA first for US waters (free, no API key needed)
  if (isUSWaters(lat, lng)) {
    console.log('[Tides] Trying NOAA (US waters)...')
    try {
      const noaaData = await getNOAATideData(lat, lng)
      if (noaaData) {
        console.log('[Tides] NOAA data found ✓')
        return noaaData
      }
      console.log('[Tides] No nearby NOAA station, trying WorldTides...')
    } catch (error) {
      console.warn('[Tides] NOAA failed:', error)
    }
  } else {
    console.log('[Tides] Non-US waters, using WorldTides...')
  }

  // Fallback to WorldTides for global coverage
  if (isWorldTidesConfigured()) {
    try {
      const worldTidesData = await getWorldTidesData(lat, lng)
      if (worldTidesData) {
        console.log('[Tides] WorldTides data found ✓')
        return worldTidesData
      }
    } catch (error) {
      console.warn('[Tides] WorldTides failed:', error)
    }
  } else {
    console.log('[Tides] WorldTides API key not configured')
  }

  console.log('[Tides] No tide data available for this location')
  return null
}

/**
 * Check if tide data is likely available for a location
 * (Quick check without making API calls)
 */
export function isTideDataLikelyAvailable(lat: number, lng: number): boolean {
  // Check if near any coast (very rough approximation)
  // This is just for UI hints, actual availability depends on API response

  // US waters have good coverage via NOAA
  if (isUSWaters(lat, lng)) {
    return true
  }

  // WorldTides has global coverage if configured
  if (isWorldTidesConfigured()) {
    return true
  }

  return false
}
