import type { TideStation, TidePrediction, TideData } from '../types/tides'

const WORLDTIDES_BASE_URL = 'https://www.worldtides.info/api/v3'

function getApiKey(): string | null {
  const key = import.meta.env.VITE_WORLDTIDES_API_KEY || null
  if (!key) {
  }
  return key
}

interface WorldTidesStation {
  id: string
  name: string
  lat: number
  lon: number
}

interface WorldTidesExtreme {
  dt: number // Unix timestamp
  height: number
  type: 'High' | 'Low'
}

/**
 * Find nearest WorldTides station
 */
export async function findNearestWorldTidesStation(
  lat: number,
  lng: number
): Promise<TideStation | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn('WorldTides API key not configured')
    return null
  }

  const params = new URLSearchParams({
    stations: '',
    lat: lat.toString(),
    lon: lng.toString(),
    key: apiKey,
  })

  const response = await fetch(`${WORLDTIDES_BASE_URL}?${params}`)

  if (!response.ok) {
    throw new Error(`WorldTides API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error || 'WorldTides API error')
  }

  if (!data.stations || data.stations.length === 0) {
    return null
  }

  // Log all available stations for debugging
  data.stations.slice(0, 5).forEach((s: WorldTidesStation, i: number) => {
  })

  // API returns stations sorted by distance
  const nearest = data.stations[0] as WorldTidesStation

  return {
    id: nearest.id,
    name: nearest.name,
    lat: nearest.lat,
    lng: nearest.lon,
    source: 'worldtides',
  }
}

/**
 * Get tide predictions from WorldTides
 */
export async function getWorldTidesPredictions(
  lat: number,
  lng: number,
  days: number = 2
): Promise<TidePrediction[]> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error('[WorldTides] Cannot fetch predictions - API key not configured')
    throw new Error('WorldTides API key not configured')
  }


  // Format today's date as YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0]

  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    date: today,
    days: days.toString(),
    datum: 'LAT', // Lowest Astronomical Tide - gives heights fishermen expect (like tidetimes.org.uk)
    key: apiKey,
  })

  // Add extremes as a flag parameter (no value)
  const url = `${WORLDTIDES_BASE_URL}?extremes&${params}`
  const response = await fetch(url)

  if (!response.ok) {
    console.error(`[WorldTides] API error: ${response.status}`)
    throw new Error(`WorldTides API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    console.error(`[WorldTides] API returned error: ${data.error}`)
    throw new Error(data.error || 'WorldTides API error')
  }

  if (!data.extremes || data.extremes.length === 0) {
    return []
  }


  return data.extremes.map((extreme: WorldTidesExtreme) => ({
    time: new Date(extreme.dt * 1000).toISOString(),
    height: extreme.height,
    type: extreme.type === 'High' ? 'high' : 'low',
  }))
}

/**
 * Get tide predictions for a specific date range (for future planning)
 */
export async function getWorldTidesPredictionsForDate(
  lat: number,
  lng: number,
  startDate: Date,
  days: number = 3
): Promise<TidePrediction[]> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error('[WorldTides] Cannot fetch predictions - API key not configured')
    throw new Error('WorldTides API key not configured')
  }

  const dateStr = startDate.toISOString().split('T')[0]

  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    date: dateStr,
    days: days.toString(),
    datum: 'LAT', // Lowest Astronomical Tide - gives heights fishermen expect
    key: apiKey,
  })

  const url = `${WORLDTIDES_BASE_URL}?extremes&${params}`
  const response = await fetch(url)

  if (!response.ok) {
    console.error(`[WorldTides] API error: ${response.status}`)
    throw new Error(`WorldTides API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    console.error(`[WorldTides] API returned error: ${data.error}`)
    throw new Error(data.error || 'WorldTides API error')
  }

  if (!data.extremes || data.extremes.length === 0) {
    return []
  }


  return data.extremes.map((extreme: WorldTidesExtreme) => ({
    time: new Date(extreme.dt * 1000).toISOString(),
    height: extreme.height,
    type: extreme.type === 'High' ? 'high' : 'low',
  }))
}

/**
 * Get complete tide data from WorldTides
 */
export async function getWorldTidesData(
  lat: number,
  lng: number
): Promise<TideData | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn('WorldTides API key not configured')
    return null
  }

  const station = await findNearestWorldTidesStation(lat, lng)
  if (!station) return null

  const predictions = await getWorldTidesPredictions(lat, lng)
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

    const futurePredictions = predictions.slice(currentIdx)
    const nextHigh = futurePredictions.find(p => p.type === 'high')
    const nextLow = futurePredictions.find(p => p.type === 'low')

    extremes = {
      nextHigh: nextHigh || null,
      nextLow: nextLow || null,
    }
  } else if (predictions.length > 0) {
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

/**
 * Check if WorldTides API is configured
 */
export function isWorldTidesConfigured(): boolean {
  return Boolean(getApiKey())
}
