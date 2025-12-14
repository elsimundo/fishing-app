/**
 * Explore Page Logic Tests
 * Run with: npx tsx src/hooks/explore.test.ts
 */

// Distance calculation (Haversine formula)
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  if (km < 10) {
    return `${km.toFixed(1)}km`
  }
  return `${Math.round(km)}km`
}

// Marker type metadata
type ExploreMarkerType = 'session' | 'catch' | 'shop' | 'club' | 'charter' | 'lake' | 'mark' | 'shared-mark' | 'zone'

const TYPE_META: Record<ExploreMarkerType, { label: string; icon: string }> = {
  session: { label: 'Session', icon: '🎣' },
  catch: { label: 'Catch', icon: '🐟' },
  shop: { label: 'Tackle shop', icon: '🛒' },
  club: { label: 'Club', icon: '👥' },
  charter: { label: 'Charter boat', icon: '⛵' },
  lake: { label: 'Lake', icon: '🏞️' },
  mark: { label: 'My Mark', icon: '📍' },
  'shared-mark': { label: 'Shared Mark', icon: '🤝' },
  zone: { label: 'Fishing Zone', icon: '🎯' },
}

// Fishing preference filtering
function shouldShowSaltwater(preference: string | null): boolean {
  return !preference || preference === 'sea' || preference === 'both'
}

function shouldShowFreshwater(preference: string | null): boolean {
  return !preference || preference === 'freshwater' || preference === 'both'
}

// Bounds checking
interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

function isWithinBounds(lat: number, lng: number, bounds: Bounds): boolean {
  return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west
}

// Filter markers by type
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
interface MarkerWithDistance {
  id: string
  distance: number
}

function sortByDistance(markers: MarkerWithDistance[]): MarkerWithDistance[] {
  return [...markers].sort((a, b) => a.distance - b.distance)
}

// Test runner
let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`❌ ${name}`)
    console.log(`   ${e instanceof Error ? e.message : e}`)
    failed++
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`)
      }
    },
    toBeCloseTo(expected: number, tolerance = 0.1) {
      if (typeof actual !== 'number') throw new Error(`Expected number, got ${typeof actual}`)
      if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`Expected ${expected} ± ${tolerance}, got ${actual}`)
      }
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${actual}`)
    },
    toBeTrue() {
      if (actual !== true) throw new Error(`Expected true, got ${actual}`)
    },
    toBeFalse() {
      if (actual !== false) throw new Error(`Expected false, got ${actual}`)
    }
  }
}

console.log('\n🗺️ EXPLORE PAGE LOGIC TESTS\n')
console.log('='.repeat(50))

// Distance Calculation Tests
console.log('\n📏 Distance Calculation Tests:\n')

test('Same point = 0 distance', () => {
  expect(calculateDistance(51.5, -0.1, 51.5, -0.1)).toBe(0)
})

test('London to Paris ≈ 344km', () => {
  // London: 51.5074, -0.1278
  // Paris: 48.8566, 2.3522
  const dist = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522)
  expect(dist).toBeCloseTo(344, 10)
})

test('Short distance (1km)', () => {
  // Approximately 1km north
  const dist = calculateDistance(51.5, -0.1, 51.509, -0.1)
  expect(dist).toBeCloseTo(1, 0.1)
})

test('Cross-equator distance', () => {
  const dist = calculateDistance(10, 0, -10, 0)
  expect(dist).toBeCloseTo(2224, 50)
})

// Distance Formatting Tests
console.log('\n📐 Distance Formatting Tests:\n')

test('500m displayed as meters', () => {
  expect(formatDistance(0.5)).toBe('500m')
})

test('850m displayed as meters', () => {
  expect(formatDistance(0.85)).toBe('850m')
})

test('1.5km displayed with decimal', () => {
  expect(formatDistance(1.5)).toBe('1.5km')
})

test('5.7km displayed with decimal', () => {
  expect(formatDistance(5.7)).toBe('5.7km')
})

test('15km displayed as whole number', () => {
  expect(formatDistance(15.3)).toBe('15km')
})

test('100km displayed as whole number', () => {
  expect(formatDistance(100)).toBe('100km')
})

// Marker Type Tests
console.log('\n📍 Marker Type Tests:\n')

test('Session marker has correct metadata', () => {
  expect(TYPE_META.session.label).toBe('Session')
  expect(TYPE_META.session.icon).toBe('🎣')
})

test('Shop marker has correct metadata', () => {
  expect(TYPE_META.shop.label).toBe('Tackle shop')
  expect(TYPE_META.shop.icon).toBe('🛒')
})

test('Lake marker has correct metadata', () => {
  expect(TYPE_META.lake.label).toBe('Lake')
  expect(TYPE_META.lake.icon).toBe('🏞️')
})

test('Zone marker has correct metadata', () => {
  expect(TYPE_META.zone.label).toBe('Fishing Zone')
  expect(TYPE_META.zone.icon).toBe('🎯')
})

// Fishing Preference Tests
console.log('\n🎣 Fishing Preference Tests:\n')

test('No preference shows saltwater', () => {
  expect(shouldShowSaltwater(null)).toBeTrue()
})

test('No preference shows freshwater', () => {
  expect(shouldShowFreshwater(null)).toBeTrue()
})

test('Sea preference shows saltwater', () => {
  expect(shouldShowSaltwater('sea')).toBeTrue()
})

test('Sea preference hides freshwater', () => {
  expect(shouldShowFreshwater('sea')).toBeFalse()
})

test('Freshwater preference hides saltwater', () => {
  expect(shouldShowSaltwater('freshwater')).toBeFalse()
})

test('Freshwater preference shows freshwater', () => {
  expect(shouldShowFreshwater('freshwater')).toBeTrue()
})

test('Both preference shows saltwater', () => {
  expect(shouldShowSaltwater('both')).toBeTrue()
})

test('Both preference shows freshwater', () => {
  expect(shouldShowFreshwater('both')).toBeTrue()
})

// Bounds Checking Tests
console.log('\n🗺️ Bounds Checking Tests:\n')

const ukBounds: Bounds = { north: 60, south: 49, east: 2, west: -11 }

test('London is within UK bounds', () => {
  expect(isWithinBounds(51.5, -0.1, ukBounds)).toBeTrue()
})

test('Paris is outside UK bounds', () => {
  expect(isWithinBounds(48.8, 2.3, ukBounds)).toBeFalse()
})

test('Edinburgh is within UK bounds', () => {
  expect(isWithinBounds(55.9, -3.2, ukBounds)).toBeTrue()
})

// Filter Key Mapping Tests
console.log('\n🔍 Filter Key Mapping Tests:\n')

test('Zone maps to zones filter', () => {
  expect(getFilterKeyForMarkerType('zone')).toBe('zones')
})

test('Shop maps to shops filter', () => {
  expect(getFilterKeyForMarkerType('shop')).toBe('shops')
})

test('Lake maps to lakes filter', () => {
  expect(getFilterKeyForMarkerType('lake')).toBe('lakes')
})

test('Mark maps to marks filter', () => {
  expect(getFilterKeyForMarkerType('mark')).toBe('marks')
})

test('Shared mark maps to marks filter', () => {
  expect(getFilterKeyForMarkerType('shared-mark')).toBe('marks')
})

test('Session has no filter (always shown)', () => {
  expect(getFilterKeyForMarkerType('session')).toBeNull()
})

test('Catch has no filter (always shown)', () => {
  expect(getFilterKeyForMarkerType('catch')).toBeNull()
})

// Sort by Distance Tests
console.log('\n📊 Sort by Distance Tests:\n')

test('Sorts markers by distance ascending', () => {
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

test('Empty array sorts without error', () => {
  const sorted = sortByDistance([])
  expect(sorted.length).toBe(0)
})

test('Single marker unchanged', () => {
  const markers: MarkerWithDistance[] = [{ id: 'only', distance: 5 }]
  const sorted = sortByDistance(markers)
  expect(sorted[0].id).toBe('only')
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`\n📋 RESULTS: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}
