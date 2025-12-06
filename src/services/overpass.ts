import type { TackleShop, TackleShopsResponse } from '../types/shops'

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter'

/**
 * Build Overpass QL query for tackle shops
 */
function buildTackleShopQuery(bounds: {
  north: number
  south: number
  east: number
  west: number
}): string {
  const { south, west, north, east } = bounds

  // Overpass QL query
  // Searches for: fishing shops, outdoor shops, and shops with "tackle" or "bait" in name
  return `
    [out:json][timeout:25];
    (
      node["shop"="fishing"](${south},${west},${north},${east});
      way["shop"="fishing"](${south},${west},${north},${east});
      node["shop"="outdoor"](${south},${west},${north},${east});
      way["shop"="outdoor"](${south},${west},${north},${east});
      node["shop"]["name"~"tackle|bait|fishing|angling",i](${south},${west},${north},${east});
      way["shop"]["name"~"tackle|bait|fishing|angling",i](${south},${west},${north},${east});
    );
    out center;
  `
}

/**
 * Build address string from OSM tags
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
 * Parse Overpass API response into TackleShop objects
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
}): TackleShop[] {
  if (!data.elements || data.elements.length === 0) {
    return []
  }

  const seen = new Set<string>()

  const shops: TackleShop[] = []

  for (const element of data.elements) {
    // Get coordinates (handle both nodes and ways)
    const lat = element.lat || element.center?.lat
    const lng = element.lon || element.center?.lon

    if (!lat || !lng) continue

    const tags = element.tags || {}

    // Dedupe by name+location
    const key = `${tags.name || ''}-${lat.toFixed(4)}-${lng.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)

    // Determine shop type from OSM tags
    let shopType: 'fishing' | 'outdoor' | 'sports' = 'fishing'
    if (tags.shop === 'outdoor') shopType = 'outdoor'
    if (tags.shop === 'sports') shopType = 'sports'

    shops.push({
      id: `osm-${element.type}-${element.id}`,
      name: tags.name || 'Unnamed Shop',
      lat,
      lng,
      address: buildAddress(tags),
      phone: tags.phone || tags['contact:phone'],
      website: tags.website || tags['contact:website'],
      openingHours: tags.opening_hours,
      shopType,
      source: 'osm',
      verified: false,
    })
  }

  return shops
}

/**
 * Fetch tackle shops from OpenStreetMap within bounds
 */
export async function getTackleShopsInBounds(bounds: {
  north: number
  south: number
  east: number
  west: number
}): Promise<TackleShopsResponse> {
  try {
    const query = buildTackleShopQuery(bounds)

    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`)
    }

    const data = await response.json()
    const shops = parseOverpassResponse(data)

    console.log(`[OSM] Found ${shops.length} tackle shops in area`)

    return {
      shops,
      fetchedAt: new Date().toISOString(),
      bounds,
    }
  } catch (error) {
    console.error('[OSM] Error fetching tackle shops:', error)
    throw error
  }
}
