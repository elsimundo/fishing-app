import type { TideStation, TidePrediction, TideData } from '../types/tides'
import { calculateDistance } from '../utils/distance'

const NOAA_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'

// Major NOAA tide stations (NOAA doesn't have a discovery API)
const NOAA_MAJOR_STATIONS: TideStation[] = [
  // East Coast
  { id: '8518750', name: 'The Battery, NY', lat: 40.7, lng: -74.014, source: 'noaa' },
  { id: '8510560', name: 'Montauk, NY', lat: 41.048, lng: -71.96, source: 'noaa' },
  { id: '8454000', name: 'Providence, RI', lat: 41.807, lng: -71.401, source: 'noaa' },
  { id: '8443970', name: 'Boston, MA', lat: 42.354, lng: -71.053, source: 'noaa' },
  { id: '8452660', name: 'Newport, RI', lat: 41.505, lng: -71.326, source: 'noaa' },
  { id: '8461490', name: 'New London, CT', lat: 41.361, lng: -72.09, source: 'noaa' },
  { id: '8534720', name: 'Atlantic City, NJ', lat: 39.355, lng: -74.418, source: 'noaa' },
  { id: '8574680', name: 'Baltimore, MD', lat: 39.267, lng: -76.579, source: 'noaa' },
  { id: '8638610', name: 'Sewells Point, VA', lat: 36.947, lng: -76.33, source: 'noaa' },
  { id: '8651370', name: 'Duck, NC', lat: 36.183, lng: -75.747, source: 'noaa' },
  { id: '8665530', name: 'Charleston, SC', lat: 32.782, lng: -79.925, source: 'noaa' },
  { id: '8670870', name: 'Fort Pulaski, GA', lat: 32.033, lng: -80.902, source: 'noaa' },
  { id: '8720030', name: 'Fernandina Beach, FL', lat: 30.672, lng: -81.465, source: 'noaa' },
  { id: '8723214', name: 'Virginia Key, FL', lat: 25.731, lng: -80.162, source: 'noaa' },
  { id: '8724580', name: 'Key West, FL', lat: 24.551, lng: -81.808, source: 'noaa' },

  // Gulf Coast
  { id: '8726520', name: 'St. Petersburg, FL', lat: 27.761, lng: -82.627, source: 'noaa' },
  { id: '8729108', name: 'Panama City, FL', lat: 30.152, lng: -85.667, source: 'noaa' },
  { id: '8735180', name: 'Dauphin Island, AL', lat: 30.25, lng: -88.075, source: 'noaa' },
  { id: '8761724', name: 'Grand Isle, LA', lat: 29.263, lng: -89.957, source: 'noaa' },
  { id: '8770570', name: 'Sabine Pass, TX', lat: 29.728, lng: -93.87, source: 'noaa' },
  { id: '8771450', name: 'Galveston, TX', lat: 29.31, lng: -94.793, source: 'noaa' },
  { id: '8775870', name: 'Port Aransas, TX', lat: 27.84, lng: -97.073, source: 'noaa' },
  { id: '8779770', name: 'Port Isabel, TX', lat: 26.061, lng: -97.215, source: 'noaa' },

  // West Coast
  { id: '9410170', name: 'San Diego, CA', lat: 32.714, lng: -117.173, source: 'noaa' },
  { id: '9410660', name: 'Los Angeles, CA', lat: 33.72, lng: -118.272, source: 'noaa' },
  { id: '9411340', name: 'Santa Barbara, CA', lat: 34.408, lng: -119.685, source: 'noaa' },
  { id: '9412110', name: 'Port San Luis, CA', lat: 35.169, lng: -120.76, source: 'noaa' },
  { id: '9413450', name: 'Monterey, CA', lat: 36.605, lng: -121.888, source: 'noaa' },
  { id: '9414290', name: 'San Francisco, CA', lat: 37.807, lng: -122.465, source: 'noaa' },
  { id: '9415020', name: 'Point Reyes, CA', lat: 37.996, lng: -122.976, source: 'noaa' },
  { id: '9418767', name: 'North Spit, CA', lat: 40.767, lng: -124.217, source: 'noaa' },
  { id: '9419750', name: 'Crescent City, CA', lat: 41.745, lng: -124.184, source: 'noaa' },
  { id: '9431647', name: 'Port Orford, OR', lat: 42.739, lng: -124.498, source: 'noaa' },
  { id: '9432780', name: 'Charleston, OR', lat: 43.345, lng: -124.322, source: 'noaa' },
  { id: '9435380', name: 'South Beach, OR', lat: 44.625, lng: -124.043, source: 'noaa' },
  { id: '9437540', name: 'Garibaldi, OR', lat: 45.555, lng: -123.918, source: 'noaa' },
  { id: '9439040', name: 'Astoria, OR', lat: 46.207, lng: -123.768, source: 'noaa' },
  { id: '9440910', name: 'Toke Point, WA', lat: 46.707, lng: -123.967, source: 'noaa' },
  { id: '9441102', name: 'Westport, WA', lat: 46.904, lng: -124.105, source: 'noaa' },
  { id: '9443090', name: 'Neah Bay, WA', lat: 48.368, lng: -124.612, source: 'noaa' },
  { id: '9444900', name: 'Port Townsend, WA', lat: 48.113, lng: -122.76, source: 'noaa' },
  { id: '9447130', name: 'Seattle, WA', lat: 47.603, lng: -122.339, source: 'noaa' },
  { id: '9449880', name: 'Friday Harbor, WA', lat: 48.546, lng: -123.01, source: 'noaa' },

  // Alaska
  { id: '9450460', name: 'Ketchikan, AK', lat: 55.332, lng: -131.626, source: 'noaa' },
  { id: '9451600', name: 'Sitka, AK', lat: 57.052, lng: -135.342, source: 'noaa' },
  { id: '9452210', name: 'Juneau, AK', lat: 58.299, lng: -134.412, source: 'noaa' },
  { id: '9455920', name: 'Anchorage, AK', lat: 61.238, lng: -149.89, source: 'noaa' },

  // Hawaii
  { id: '1612340', name: 'Honolulu, HI', lat: 21.307, lng: -157.867, source: 'noaa' },
  { id: '1615680', name: 'Kahului, HI', lat: 20.895, lng: -156.477, source: 'noaa' },
  { id: '1617433', name: 'Kawaihae, HI', lat: 20.037, lng: -155.829, source: 'noaa' },
]

/**
 * Find nearest NOAA tide station to a location
 */
export function findNearestNOAAStation(
  lat: number,
  lng: number,
  maxDistanceKm: number = 100
): TideStation | null {
  const stationsWithDistance = NOAA_MAJOR_STATIONS.map(station => ({
    ...station,
    distance: calculateDistance(lat, lng, station.lat, station.lng),
  }))

  stationsWithDistance.sort((a, b) => a.distance - b.distance)

  const nearest = stationsWithDistance[0]
  if (nearest && nearest.distance <= maxDistanceKm) {
    return nearest
  }

  return null
}

/**
 * Get tide predictions from NOAA for a specific station
 */
export async function getNOAATidePredictions(
  stationId: string,
  days: number = 2
): Promise<TidePrediction[]> {
  const now = new Date()
  const beginDate = now.toISOString().split('T')[0].replace(/-/g, '')
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
    .replace(/-/g, '')

  const params = new URLSearchParams({
    application: 'FishingApp',
    format: 'json',
    units: 'metric',
    time_zone: 'lst_ldt', // Local time with daylight saving
    product: 'predictions',
    datum: 'MLLW',
    interval: 'hilo', // High/Low only
    begin_date: beginDate,
    end_date: endDate,
    station: stationId,
  })

  const response = await fetch(`${NOAA_BASE_URL}?${params}`)

  if (!response.ok) {
    throw new Error(`NOAA API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message || 'NOAA API error')
  }

  if (!data.predictions || data.predictions.length === 0) {
    return []
  }

  return data.predictions.map((pred: { t: string; v: string; type: string }) => ({
    time: new Date(pred.t).toISOString(),
    height: parseFloat(pred.v),
    type: pred.type === 'H' ? 'high' : 'low',
  }))
}

/**
 * Get complete tide data from NOAA
 */
export async function getNOAATideData(
  lat: number,
  lng: number
): Promise<TideData | null> {
  const station = findNearestNOAAStation(lat, lng)
  if (!station) return null

  const predictions = await getNOAATidePredictions(station.id)
  if (predictions.length === 0) return null

  const now = new Date()
  const currentIdx = predictions.findIndex(p => new Date(p.time) > now)

  let current: TideData['current'] = undefined
  let extremes: TideData['extremes'] = undefined

  if (currentIdx > 0) {
    const prev = predictions[currentIdx - 1]
    const next = predictions[currentIdx]
    const prevTime = new Date(prev.time).getTime()
    const nextTime = new Date(next.time).getTime()
    const nowTime = now.getTime()
    const progress = (nowTime - prevTime) / (nextTime - prevTime)

    // Interpolate current height using cosine for smoother curve
    const cosProgress = (1 - Math.cos(progress * Math.PI)) / 2
    const currentHeight = prev.height + (next.height - prev.height) * cosProgress

    current = {
      height: currentHeight,
      type: next.type === 'high' ? 'rising' : 'falling',
      nextTide: next,
    }

    const futurePredicitions = predictions.slice(currentIdx)
    const nextHigh = futurePredicitions.find(p => p.type === 'high')
    const nextLow = futurePredicitions.find(p => p.type === 'low')

    extremes = {
      nextHigh: nextHigh || null,
      nextLow: nextLow || null,
    }
  } else if (predictions.length > 0) {
    // All predictions are in the future
    const next = predictions[0]
    current = {
      height: 0,
      type: next.type === 'high' ? 'rising' : 'falling',
      nextTide: next,
    }

    const nextHigh = predictions.find(p => p.type === 'high')
    const nextLow = predictions.find(p => p.type === 'low')

    extremes = {
      nextHigh: nextHigh || null,
      nextLow: nextLow || null,
    }
  }

  return {
    station,
    predictions,
    current,
    extremes,
    fetchedAt: now.toISOString(),
  }
}
