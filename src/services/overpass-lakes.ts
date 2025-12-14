import type { Lake } from '../types'

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter'

interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Build Overpass QL query for fishing lakes/waters
 */
function buildLakesQuery(bounds: Bounds): string {
  const { south, west, north, east } = bounds

  // Search for:
  // 1. Dedicated fishing venues (leisure=fishing)
  // 2. Water bodies with fishing/angling in name
  // 3. Natural water tagged for fishing
  // 4. Fishing ponds
  return `
    [out:json][timeout:30];
    (
      // Dedicated fishing venues
      node["leisure"="fishing"](${south},${west},${north},${east});
      way["leisure"="fishing"](${south},${west},${north},${east});
      relation["leisure"="fishing"](${south},${west},${north},${east});
      
      // Water with sport=fishing tag
      node["sport"="fishing"](${south},${west},${north},${east});
      way["sport"="fishing"](${south},${west},${north},${east});
      
      // Named fishing waters
      node["natural"="water"]["name"~"fish|lake|pond|pool|fishery|angling",i](${south},${west},${north},${east});
      way["natural"="water"]["name"~"fish|lake|pond|pool|fishery|angling",i](${south},${west},${north},${east});
      
      // Landuse reservoir with fishing names
      way["landuse"="reservoir"]["name"~"fish|angling",i](${south},${west},${north},${east});
      
      // Water bodies tagged as fishing
      way["water"]["fishing"](${south},${west},${north},${east});
    );
    out center tags;
  `
}

/**
 * Determine water type from OSM tags
 */
function getWaterType(tags: Record<string, string>): Lake['water_type'] {
  if (tags.water === 'pond' || tags.natural === 'pond') return 'pond'
  if (tags.water === 'reservoir' || tags.landuse === 'reservoir') return 'reservoir'
  if (tags.waterway === 'river' || tags.water === 'river') return 'river'
  if (tags.waterway === 'canal' || tags.water === 'canal') return 'canal'
  if (tags.water === 'lake' || tags.natural === 'water') return 'lake'
  return 'lake'
}

/**
 * Build address from OSM tags
 */
function buildAddress(tags: Record<string, string>): string | undefined {
  const parts: string[] = []
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber'])
  if (tags['addr:street']) parts.push(tags['addr:street'])
  if (tags['addr:city']) parts.push(tags['addr:city'])
  if (tags['addr:postcode']) parts.push(tags['addr:postcode'])
  return parts.length > 0 ? parts.join(', ') : undefined
}

/**
 * Parse Overpass API response into Lake objects
 */
function parseOverpassResponse(data: {
  elements?: Array<{
    type: string
    id: number
    lat?: number
    lon?: number
    center?: { lat: number; lon: number }
    tags?: Record<string, string>
  }>
}): Partial<Lake>[] {
  if (!data.elements || data.elements.length === 0) {
    return []
  }

  const seen = new Set<string>()
  const lakes: Partial<Lake>[] = []

  for (const element of data.elements) {
    const lat = element.lat || element.center?.lat
    const lng = element.lon || element.center?.lon

    if (!lat || !lng) continue

    const tags = element.tags || {}
    const name = tags.name || 'Unnamed Lake'

    // Dedupe by name+location
    const key = `${name.toLowerCase()}-${lat.toFixed(3)}-${lng.toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)

    // Skip if no name (unless it's a dedicated fishing venue)
    if (!tags.name && tags.leisure !== 'fishing' && tags.sport !== 'fishing') {
      continue
    }

    lakes.push({
      id: `osm-${element.type}-${element.id}`,
      name,
      latitude: lat,
      longitude: lng,
      water_type: getWaterType(tags),
      address: buildAddress(tags),
      postcode: tags['addr:postcode'],
      region: tags['addr:city'] || tags['addr:county'],
      phone: tags.phone || tags['contact:phone'],
      website: tags.website || tags['contact:website'],
      email: tags.email || tags['contact:email'],
      description: tags.description,
      // Facilities from OSM tags
      has_parking: tags.parking === 'yes' || tags.amenity === 'parking',
      has_toilets: tags.toilets === 'yes' || tags.amenity === 'toilets',
      has_cafe: tags.amenity === 'cafe' || tags.cafe === 'yes',
      is_night_fishing_allowed: tags.night_fishing === 'yes',
      is_disabled_accessible: tags.wheelchair === 'yes',
      // Default values for OSM lakes
      is_verified: false,
      is_premium: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  return lakes
}

/**
 * Fetch fishing lakes from OpenStreetMap via Overpass API
 */
export async function fetchLakesFromOSM(bounds: Bounds): Promise<Partial<Lake>[]> {
  try {
    const query = buildLakesQuery(bounds)

    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!response.ok) {
      console.error('[OSM Lakes] API error:', response.status, response.statusText)
      return []
    }

    const data = await response.json()
    const lakes = parseOverpassResponse(data)
    
    return lakes
  } catch (error) {
    console.error('[OSM Lakes] Fetch error:', error)
    return []
  }
}
