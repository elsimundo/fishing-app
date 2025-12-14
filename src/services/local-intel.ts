import { supabase } from '../lib/supabase'
import { calculateDistance } from '../utils/distance'
import type { FishingPreference } from '../types'

export interface LocalIntelData {
  totalCatches: number
  uniqueAnglers: number
  periodDays: number
  areaDescription: string
  topSpecies: { species: string; count: number; avgWeight: number | null }[]
  topBaits: { bait: string; count: number }[]
  catchesByTimeOfDay: { period: string; count: number; percentage: number }[]
  avgCatchWeight: number | null
  biggestCatch: { species: string; weight: number; date: string } | null
  // New engagement features
  speciesBaitCorrelation: { species: string; topBaits: { bait: string; count: number }[] }[]
  timeSpeciesCorrelation: { period: string; topSpecies: { species: string; count: number }[] }[]
  recentActivity: { catchesLast24h: number; lastCatchTime: string | null }
}

/**
 * Get aggregated fishing intel for an area
 */
export async function getLocalIntel(
  lat: number,
  lng: number,
  bounds?: { north: number; south: number; east: number; west: number } | null,
  days: number = 30,
  waterPreference?: FishingPreference | null
): Promise<LocalIntelData | null> {

  // Fetch both individual catches AND fishing zones (aggregated community data)
  // so Local Intel reflects all blue markers visible on the map
  const { data: rawCatches, error: catchError } = await supabase
    .from('catches')
    .select('id, user_id, species, bait, weight_kg, length_cm, caught_at, latitude, longitude, session:sessions(water_type, location_privacy)')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('caught_at', { ascending: false })
    .limit(1000)
  
  if (catchError) {
    console.error('[LocalIntel] Error fetching catches:', catchError)
    return null
  }

  // Fetch fishing zones in the area
  let zonesQuery = supabase
    .from('fishing_zones')
    .select('*')
    .gte('total_catches', 1)

  if (bounds) {
    zonesQuery = zonesQuery
      .gte('center_lat', bounds.south)
      .lte('center_lat', bounds.north)
      .gte('center_lng', bounds.west)
      .lte('center_lng', bounds.east)
  }

  const { data: zones, error: zoneError } = await zonesQuery

  if (zoneError) {
    console.error('[LocalIntel] Error fetching zones:', zoneError)
  }

  let catches = rawCatches ?? []
  
  
  // NOTE: We deliberately do not filter by waterPreference here.
  // Local Intel should reflect everything in the visible area
  // regardless of whether it's sea / freshwater. If we want to
  // add a sea/freshwater toggle later, it should be a dedicated
  // UI control rather than silently using profile preference.

  const emptyResult: LocalIntelData = {
    totalCatches: 0,
    uniqueAnglers: 0,
    periodDays: days,
    areaDescription: 'visible area',
    topSpecies: [],
    topBaits: [],
    catchesByTimeOfDay: [],
    avgCatchWeight: null,
    biggestCatch: null,
    speciesBaitCorrelation: [],
    timeSpeciesCorrelation: [],
    recentActivity: { catchesLast24h: 0, lastCatchTime: null },
  }

  if (!catches || catches.length === 0) {
    return emptyResult
  }

  // Filter by bounds if provided, otherwise use a default radius
  let nearbyCatches: typeof catches
  if (bounds) {
    
    nearbyCatches = catches.filter((c) => {
      if (!c.latitude || !c.longitude) {
        return false
      }
      const inBounds = (
        c.latitude >= bounds.south &&
        c.latitude <= bounds.north &&
        c.longitude >= bounds.west &&
        c.longitude <= bounds.east
      )
      return inBounds
    })
  } else {
    // Fallback to 50km radius if no bounds provided
    nearbyCatches = catches.filter((c) => {
      if (!c.latitude || !c.longitude) return false
      const distance = calculateDistance(lat, lng, c.latitude, c.longitude)
      return distance <= 50
    })
  }

  // Add zone data to the totals
  const zonesInBounds = (zones ?? []).filter((z) => {
    if (!bounds) return true
    return (
      z.center_lat >= bounds.south &&
      z.center_lat <= bounds.north &&
      z.center_lng >= bounds.west &&
      z.center_lng <= bounds.east
    )
  })

  const totalZoneCatches = zonesInBounds.reduce((sum, z) => sum + (z.total_catches || 0), 0)
  const totalZoneAnglers = zonesInBounds.reduce((sum, z) => sum + (z.unique_anglers || 0), 0)


  if (totalZoneCatches === 0) {
    return emptyResult
  }

  // Aggregate species from individual catches (for detailed breakdowns)
  // Note: We use individual catches for species/bait/time detail, but zone totals for counts
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

  // Merge zone species counts
  for (const zone of zonesInBounds) {
    if (zone.species_counts && typeof zone.species_counts === 'object') {
      for (const [species, count] of Object.entries(zone.species_counts)) {
        const existing = speciesMap.get(species) || { count: 0, totalWeight: 0, weightCount: 0 }
        existing.count += Number(count) || 0
        speciesMap.set(species, existing)
      }
    }
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

  // Species-Bait Correlation: Show which baits work best for each top species
  const speciesBaitCorrelation: LocalIntelData['speciesBaitCorrelation'] = []
  for (const { species } of topSpecies.slice(0, 3)) { // Top 3 species only
    const speciesCatches = nearbyCatches.filter((c) => c.species === species && c.bait)
    const baitCounts = new Map<string, number>()
    
    for (const c of speciesCatches) {
      if (c.bait) {
        baitCounts.set(c.bait, (baitCounts.get(c.bait) || 0) + 1)
      }
    }
    
    const topBaitsForSpecies = Array.from(baitCounts.entries())
      .map(([bait, count]) => ({ bait, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3) // Top 3 baits per species
    
    if (topBaitsForSpecies.length > 0) {
      speciesBaitCorrelation.push({ species, topBaits: topBaitsForSpecies })
    }
  }

  // Time-Species Correlation: Show which species are caught at which times
  const timeSpeciesCorrelation: LocalIntelData['timeSpeciesCorrelation'] = []
  
  for (const period of periodOrder) {
    const periodCatches = nearbyCatches.filter((c) => {
      const hour = new Date(c.caught_at).getHours()
      let catchPeriod: string
      if (hour >= 5 && hour < 9) catchPeriod = 'Dawn'
      else if (hour >= 9 && hour < 12) catchPeriod = 'Morning'
      else if (hour >= 12 && hour < 17) catchPeriod = 'Afternoon'
      else if (hour >= 17 && hour < 21) catchPeriod = 'Evening'
      else catchPeriod = 'Night'
      return catchPeriod === period
    })
    
    if (periodCatches.length > 0) {
      const speciesCounts = new Map<string, number>()
      for (const c of periodCatches) {
        if (c.species) {
          speciesCounts.set(c.species, (speciesCounts.get(c.species) || 0) + 1)
        }
      }
      
      const topSpeciesForPeriod = Array.from(speciesCounts.entries())
        .map(([species, count]) => ({ species, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3) // Top 3 species per time period
      
      if (topSpeciesForPeriod.length > 0) {
        timeSpeciesCorrelation.push({ period, topSpecies: topSpeciesForPeriod })
      }
    }
  }

  // Recent Activity: Catches in last 24 hours
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCatches = nearbyCatches.filter((c) => new Date(c.caught_at) > last24h)
  const lastCatchTime = nearbyCatches.length > 0 ? nearbyCatches[0].caught_at : null

  return {
    // Use zone totals for counts (avoids double-counting individual catches)
    totalCatches: totalZoneCatches,
    uniqueAnglers: totalZoneAnglers,
    periodDays: days,
    areaDescription: bounds ? 'visible area' : '50km radius',
    topSpecies,
    topBaits,
    catchesByTimeOfDay,
    avgCatchWeight,
    biggestCatch,
    speciesBaitCorrelation,
    timeSpeciesCorrelation,
    recentActivity: {
      catchesLast24h: recentCatches.length,
      lastCatchTime,
    },
  }
}
