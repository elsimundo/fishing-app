import type { TideData } from '../types/tides'
import { getNOAATideData } from './noaa-tides'
import { getWorldTidesData, getWorldTidesPredictions, isWorldTidesConfigured } from './worldtides'
import { getUKTideGaugeData, convertGaugeToTideData } from './uk-ea-tides'

/**
 * Check if location is in UK waters (rough approximation)
 */
function isUKWaters(lat: number, lng: number): boolean {
  // UK and Ireland coastal waters
  return lat >= 49 && lat <= 61 && lng >= -11 && lng <= 2
}

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
 * Priority: UK-EA (UK) → NOAA (US) → WorldTides (global)
 */
export async function getTideData(
  lat: number,
  lng: number
): Promise<TideData | null> {
  // Try UK Environment Agency first for UK waters (free, real-time data)
  // Supplement with WorldTides predictions for accurate tide times
  if (isUKWaters(lat, lng)) {
    console.log('[Tides] Trying UK Environment Agency (UK waters)...')
    try {
      const gaugeData = await getUKTideGaugeData(lat, lng)
      if (gaugeData) {
        let tideData = convertGaugeToTideData(gaugeData)
        if (tideData) {
          // UK-EA only has real-time readings, not predictions
          // Supplement with WorldTides predictions if available
          if (isWorldTidesConfigured() && tideData.predictions.length < 4) {
            console.log('[Tides] Supplementing UK-EA with WorldTides predictions...')
            try {
              const predictions = await getWorldTidesPredictions(lat, lng, 2)
              if (predictions.length > 0) {
                tideData = {
                  ...tideData,
                  predictions,
                  extremes: {
                    nextHigh: predictions.find(p => p.type === 'high' && new Date(p.time) > new Date()) || null,
                    nextLow: predictions.find(p => p.type === 'low' && new Date(p.time) > new Date()) || null,
                  },
                }
                console.log('[Tides] WorldTides predictions added ✓')
              }
            } catch (e) {
              console.log('[Tides] WorldTides supplement failed, using UK-EA only')
            }
          }
          console.log('[Tides] UK-EA data found ✓')
          return tideData
        }
      }
      console.log('[Tides] No nearby UK-EA station, trying WorldTides...')
    } catch (error) {
      console.warn('[Tides] UK-EA failed:', error)
    }
  }

  // Try NOAA for US waters (free, no API key needed)
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
  }

  // Fallback to WorldTides for global coverage
  if (isWorldTidesConfigured()) {
    console.log('[Tides] Trying WorldTides (global)...')
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

  // UK waters have excellent coverage via UK-EA
  if (isUKWaters(lat, lng)) {
    return true
  }

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
