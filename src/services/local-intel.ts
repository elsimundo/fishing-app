import { supabase } from '../lib/supabase'
import { calculateDistance } from '../utils/distance'

export interface LocalIntelData {
  totalCatches: number
  uniqueAnglers: number
  periodDays: number
  radiusKm: number
  topSpecies: { species: string; count: number; avgWeight: number | null }[]
  topBaits: { bait: string; count: number }[]
  catchesByTimeOfDay: { period: string; count: number; percentage: number }[]
  avgCatchWeight: number | null
  biggestCatch: { species: string; weight: number; date: string } | null
}

/**
 * Get aggregated fishing intel for an area
 */
export async function getLocalIntel(
  lat: number,
  lng: number,
  radiusKm: number = 25,
  days: number = 30
): Promise<LocalIntelData | null> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Fetch catches with location data from the last N days
  // We filter by distance in JS since Supabase doesn't have PostGIS
  const { data: catches, error } = await supabase
    .from('catches')
    .select('id, user_id, species, bait, weight_kg, length_cm, caught_at, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('caught_at', since)
    .order('caught_at', { ascending: false })
    .limit(1000)

  if (error) {
    console.error('[LocalIntel] Error fetching catches:', error)
    return null
  }

  const emptyResult: LocalIntelData = {
    totalCatches: 0,
    uniqueAnglers: 0,
    periodDays: days,
    radiusKm,
    topSpecies: [],
    topBaits: [],
    catchesByTimeOfDay: [],
    avgCatchWeight: null,
    biggestCatch: null,
  }

  if (!catches || catches.length === 0) {
    return emptyResult
  }

  // Filter by distance
  const nearbyCatches = catches.filter((c) => {
    if (!c.latitude || !c.longitude) return false
    const distance = calculateDistance(lat, lng, c.latitude, c.longitude)
    return distance <= radiusKm
  })

  if (nearbyCatches.length === 0) {
    return emptyResult
  }

  // Aggregate species
  const speciesMap = new Map<string, { count: number; totalWeight: number; weightCount: number }>()
  for (const c of nearbyCatches) {
    const species = c.species?.trim() || 'Unknown'
    const existing = speciesMap.get(species) || { count: 0, totalWeight: 0, weightCount: 0 }
    existing.count++
    if (c.weight_kg) {
      existing.totalWeight += c.weight_kg
      existing.weightCount++
    }
    speciesMap.set(species, existing)
  }

  const topSpecies = Array.from(speciesMap.entries())
    .map(([species, data]) => ({
      species,
      count: data.count,
      avgWeight: data.weightCount > 0 ? data.totalWeight / data.weightCount : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Aggregate baits
  const baitMap = new Map<string, number>()
  for (const c of nearbyCatches) {
    if (c.bait) {
      const bait = c.bait.trim()
      baitMap.set(bait, (baitMap.get(bait) || 0) + 1)
    }
  }

  const topBaits = Array.from(baitMap.entries())
    .map(([bait, count]) => ({ bait, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Time of day analysis
  const timeOfDayMap = new Map<string, number>()
  const periodOrder = ['Dawn', 'Morning', 'Afternoon', 'Evening', 'Night']
  
  for (const c of nearbyCatches) {
    const hour = new Date(c.caught_at).getHours()
    let period: string
    if (hour >= 5 && hour < 9) period = 'Dawn'
    else if (hour >= 9 && hour < 12) period = 'Morning'
    else if (hour >= 12 && hour < 17) period = 'Afternoon'
    else if (hour >= 17 && hour < 21) period = 'Evening'
    else period = 'Night'

    timeOfDayMap.set(period, (timeOfDayMap.get(period) || 0) + 1)
  }

  const totalForPercentage = nearbyCatches.length
  const catchesByTimeOfDay = periodOrder
    .filter(period => timeOfDayMap.has(period))
    .map(period => ({
      period,
      count: timeOfDayMap.get(period) || 0,
      percentage: Math.round(((timeOfDayMap.get(period) || 0) / totalForPercentage) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // Average weight and biggest catch
  const catchesWithWeight = nearbyCatches.filter((c) => c.weight_kg && c.weight_kg > 0)
  const avgCatchWeight =
    catchesWithWeight.length > 0
      ? catchesWithWeight.reduce((sum, c) => sum + (c.weight_kg || 0), 0) / catchesWithWeight.length
      : null

  let biggestCatch: LocalIntelData['biggestCatch'] = null
  if (catchesWithWeight.length > 0) {
    const biggest = catchesWithWeight.reduce((max, c) =>
      (c.weight_kg || 0) > (max.weight_kg || 0) ? c : max
    )
    biggestCatch = {
      species: biggest.species || 'Unknown',
      weight: biggest.weight_kg || 0,
      date: biggest.caught_at,
    }
  }

  // Unique anglers
  const uniqueAnglers = new Set(nearbyCatches.map((c) => c.user_id)).size

  return {
    totalCatches: nearbyCatches.length,
    uniqueAnglers,
    periodDays: days,
    radiusKm,
    topSpecies,
    topBaits,
    catchesByTimeOfDay,
    avgCatchWeight,
    biggestCatch,
  }
}
