/**
 * Explore Page Logic Tests
 */
import { describe, it, expect } from 'vitest'

// Distance calculation (Haversine formula)
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  if (km < 10) return `${km.toFixed(1)}km`
  return `${Math.round(km)}km`
}

// Fishing preference filtering
function shouldShowSaltwater(preference: string | null): boolean {
  return !preference || preference === 'sea' || preference === 'both'
}

function shouldShowFreshwater(preference: string | null): boolean {
  return !preference || preference === 'freshwater' || preference === 'both'
}

// Bounds checking
interface Bounds { north: number; south: number; east: number; west: number }

function isWithinBounds(lat: number, lng: number, bounds: Bounds): boolean {
  return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west
}

// Filter key mapping
type ExploreMarkerType = 'session' | 'catch' | 'shop' | 'club' | 'charter' | 'lake' | 'mark' | 'shared-mark' | 'zone'
type FilterKey = 'zones' | 'shops' | 'clubs' | 'charters' | 'lakes' | 'marks'

function getFilterKeyForMarkerType(type: ExploreMarkerType): FilterKey | null {
  switch (type) {
    case 'zone': return 'zones'
    case 'shop': return 'shops'
    case 'club': return 'clubs'
    case 'charter': return 'charters'
    case 'lake': return 'lakes'
    case 'mark':
    case 'shared-mark': return 'marks'
    default: return null
  }
}

// Sort by distance
interface MarkerWithDistance { id: string; distance: number }

function sortByDistance(markers: MarkerWithDistance[]): MarkerWithDistance[] {
  return [...markers].sort((a, b) => a.distance - b.distance)
}

describe('Distance Calculation', () => {
  it('Same point = 0 distance', () => {
    expect(calculateDistance(51.5, -0.1, 51.5, -0.1)).toBe(0)
  })

  it('London to Paris ≈ 344km', () => {
    const dist = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522)
    expect(dist).toBeCloseTo(344, 0)
  })

  it('Short distance (1km)', () => {
    const dist = calculateDistance(51.5, -0.1, 51.509, -0.1)
    expect(dist).toBeCloseTo(1, 0)
  })
})

describe('Distance Formatting', () => {
  it('500m displayed as meters', () => expect(formatDistance(0.5)).toBe('500m'))
  it('850m displayed as meters', () => expect(formatDistance(0.85)).toBe('850m'))
  it('1.5km displayed with decimal', () => expect(formatDistance(1.5)).toBe('1.5km'))
  it('15km displayed as whole number', () => expect(formatDistance(15.3)).toBe('15km'))
})

describe('Fishing Preference', () => {
  it('No preference shows saltwater', () => expect(shouldShowSaltwater(null)).toBe(true))
  it('No preference shows freshwater', () => expect(shouldShowFreshwater(null)).toBe(true))
  it('Sea preference shows saltwater', () => expect(shouldShowSaltwater('sea')).toBe(true))
  it('Sea preference hides freshwater', () => expect(shouldShowFreshwater('sea')).toBe(false))
  it('Freshwater preference hides saltwater', () => expect(shouldShowSaltwater('freshwater')).toBe(false))
  it('Both preference shows both', () => {
    expect(shouldShowSaltwater('both')).toBe(true)
    expect(shouldShowFreshwater('both')).toBe(true)
  })
})

describe('Bounds Checking', () => {
  const ukBounds: Bounds = { north: 60, south: 49, east: 2, west: -11 }

  it('London is within UK bounds', () => expect(isWithinBounds(51.5, -0.1, ukBounds)).toBe(true))
  it('Paris is outside UK bounds', () => expect(isWithinBounds(48.8, 2.3, ukBounds)).toBe(false))
  it('Edinburgh is within UK bounds', () => expect(isWithinBounds(55.9, -3.2, ukBounds)).toBe(true))
})

describe('Filter Key Mapping', () => {
  it('Zone maps to zones filter', () => expect(getFilterKeyForMarkerType('zone')).toBe('zones'))
  it('Shop maps to shops filter', () => expect(getFilterKeyForMarkerType('shop')).toBe('shops'))
  it('Lake maps to lakes filter', () => expect(getFilterKeyForMarkerType('lake')).toBe('lakes'))
  it('Session has no filter', () => expect(getFilterKeyForMarkerType('session')).toBeNull())
})

describe('Sort by Distance', () => {
  it('Sorts markers by distance ascending', () => {
    const markers: MarkerWithDistance[] = [
      { id: 'far', distance: 10 },
      { id: 'near', distance: 1 },
      { id: 'mid', distance: 5 }
    ]
    const sorted = sortByDistance(markers)
    expect(sorted[0].id).toBe('near')
    expect(sorted[1].id).toBe('mid')
    expect(sorted[2].id).toBe('far')
  })

  it('Empty array sorts without error', () => {
    expect(sortByDistance([]).length).toBe(0)
  })
})
