import type { TideStation, TideReading, TideGaugeData, TidePrediction, TideData } from '../types/tides'
import { calculateDistance } from '../utils/distance'

const UK_EA_BASE_URL = 'https://environment.data.gov.uk/flood-monitoring'

interface UKEAStation {
  '@id': string
  stationReference: string
  label: string
  lat: number
  long: number
  town?: string
}

interface UKEAReading {
  '@id': string
  dateTime: string
  measure: string
  value: number
}

// Cache stations to avoid repeated API calls
let cachedStations: TideStation[] | null = null
let stationsCacheTime: number = 0
const STATIONS_CACHE_DURATION = 60 * 60 * 1000 // 1 hour

/**
 * Get all UK tide gauge stations
 */
async function getAllUKTideStations(): Promise<TideStation[]> {
  // Return cached if fresh
  if (cachedStations && Date.now() - stationsCacheTime < STATIONS_CACHE_DURATION) {
    return cachedStations
  }

  const response = await fetch(`${UK_EA_BASE_URL}/id/stations?type=TideGauge&_limit=200`)

  if (!response.ok) {
    throw new Error(`UK-EA API error: ${response.status}`)
  }

  const data = await response.json()
  const items = data.items || []

  cachedStations = items.map((station: UKEAStation) => ({
    id: station.stationReference,
    name: station.label,
    lat: station.lat,
    lng: station.long,
    source: 'uk-ea' as const,
  }))

  stationsCacheTime = Date.now()
  return cachedStations!
}

/**
 * Find nearest UK tide gauge station
 */
export async function findNearestUKStation(
  lat: number,
  lng: number,
  maxDistanceKm: number = 30
): Promise<TideStation | null> {
  const stations = await findNearbyUKStations(lat, lng, maxDistanceKm, 1)
  return stations[0] || null
}

/**
 * Find multiple nearby UK tide gauge stations
 */
export async function findNearbyUKStations(
  lat: number,
  lng: number,
  maxDistanceKm: number = 50,
  limit: number = 5
): Promise<TideStation[]> {
  const stations = await getAllUKTideStations()

  if (stations.length === 0) return []

  // Calculate distances
  const stationsWithDistance = stations.map(station => ({
    ...station,
    distance: calculateDistance(lat, lng, station.lat, station.lng),
  }))

  // Sort by distance and filter by max distance
  return stationsWithDistance
    .filter(s => s.distance <= maxDistanceKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}

/**
 * Get latest tide reading from a station
 */
async function getLatestReading(stationId: string): Promise<TideReading | null> {
  const response = await fetch(`${UK_EA_BASE_URL}/id/stations/${stationId}/readings?latest`)

  if (!response.ok) {
    throw new Error(`UK-EA API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) return null

  const reading = data.items[0] as UKEAReading
  return {
    time: reading.dateTime,
    level: reading.value,
  }
}

/**
 * Get historical readings from a station (last 24 hours)
 */
async function getHistoricalReadings(stationId: string): Promise<TideReading[]> {
  // Get readings from last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const response = await fetch(
    `${UK_EA_BASE_URL}/id/stations/${stationId}/readings?_sorted&since=${since}&_limit=200`
  )

  if (!response.ok) {
    throw new Error(`UK-EA API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) return []

  return data.items.map((reading: UKEAReading) => ({
    time: reading.dateTime,
    level: reading.value,
  }))
}

/**
 * Calculate tide predictions from historical data
 * Finds local maxima (high tides) and minima (low tides)
 */
function calculatePredictionsFromReadings(readings: TideReading[]): TidePrediction[] {
  if (readings.length < 5) return []

  // Sort by time ascending
  const sorted = [...readings].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  )

  const predictions: TidePrediction[] = []

  // Use a window to smooth out noise
  const windowSize = 3
  for (let i = windowSize; i < sorted.length - windowSize; i++) {
    const current = sorted[i]

    // Get average of surrounding readings
    let beforeSum = 0
    let afterSum = 0
    for (let j = 1; j <= windowSize; j++) {
      beforeSum += sorted[i - j].level
      afterSum += sorted[i + j].level
    }
    const beforeAvg = beforeSum / windowSize
    const afterAvg = afterSum / windowSize

    // Local maximum (high tide)
    if (current.level > beforeAvg && current.level > afterAvg) {
      // Check if significantly higher (at least 0.3m difference)
      if (current.level - beforeAvg > 0.3 && current.level - afterAvg > 0.3) {
        predictions.push({
          time: current.time,
          height: current.level,
          type: 'high',
        })
      }
    }

    // Local minimum (low tide)
    if (current.level < beforeAvg && current.level < afterAvg) {
      // Check if significantly lower
      if (beforeAvg - current.level > 0.3 && afterAvg - current.level > 0.3) {
        predictions.push({
          time: current.time,
          height: current.level,
          type: 'low',
        })
      }
    }
  }

  // Remove duplicates that are too close together (within 2 hours)
  const filtered: TidePrediction[] = []
  for (const pred of predictions) {
    const tooClose = filtered.some(
      existing =>
        Math.abs(new Date(existing.time).getTime() - new Date(pred.time).getTime()) <
        2 * 60 * 60 * 1000
    )
    if (!tooClose) {
      filtered.push(pred)
    }
  }

  return filtered
}

/**
 * Get complete tide gauge data from UK-EA
 */
export async function getUKTideGaugeData(
  lat: number,
  lng: number
): Promise<TideGaugeData | null> {
  const station = await findNearestUKStation(lat, lng)
  if (!station) return null

  return getUKTideGaugeDataForStation(station)
}

/**
 * Get tide gauge data for a specific station
 */
export async function getUKTideGaugeDataForStation(
  station: TideStation
): Promise<TideGaugeData | null> {
  // Get latest reading and historical readings in parallel
  const [latestReading, readings] = await Promise.all([
    getLatestReading(station.id),
    getHistoricalReadings(station.id),
  ])

  // Derive predictions from historical data
  const predictions = calculatePredictionsFromReadings(readings)

  return {
    station,
    latestReading: latestReading || undefined,
    readings: readings.length > 0 ? readings : undefined,
    predictions: predictions.length > 0 ? predictions : undefined,
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Convert gauge data to standard TideData format
 */
export function convertGaugeToTideData(gaugeData: TideGaugeData): TideData | null {
  if (!gaugeData.latestReading) return null

  const { station, latestReading, predictions = [], readings = [] } = gaugeData

  // Determine if tide is rising or falling from recent readings
  let tideType: 'rising' | 'falling' = 'rising'
  if (readings.length >= 3) {
    // Sort by time descending to get most recent
    const sorted = [...readings].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )
    const recent = sorted.slice(0, 3)
    // Compare most recent to slightly older
    tideType = recent[0].level > recent[2].level ? 'rising' : 'falling'
  }

  // Find next predicted high/low (future only)
  const now = new Date()
  const futurePredictions = predictions.filter(p => new Date(p.time) > now)

  const nextHigh = futurePredictions.find(p => p.type === 'high') || null
  const nextLow = futurePredictions.find(p => p.type === 'low') || null

  // Estimate next tide if no predictions available
  const nextTide: TidePrediction = futurePredictions[0] || {
    time: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    height: latestReading.level + (tideType === 'rising' ? 1 : -1),
    type: tideType === 'rising' ? 'high' : 'low',
  }

  return {
    station,
    predictions,
    current: {
      height: latestReading.level,
      type: tideType,
      nextTide,
    },
    extremes: {
      nextHigh,
      nextLow,
    },
    fetchedAt: gaugeData.fetchedAt,
    gaugeData,
  }
}
