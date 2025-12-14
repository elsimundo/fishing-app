/**
 * Session Stats & Logic Tests
 * Run with: npx tsx src/hooks/sessions.test.ts
 */

// Types (simplified for testing)
interface Session {
  id: string
  started_at: string
  ended_at: string | null
}

interface Catch {
  id: string
  species: string
  weight_kg: number | null
}

interface SessionStats {
  total_catches: number
  total_weight_kg: number
  biggest_catch: Catch | null
  species_breakdown: Record<string, number>
  duration_hours: number
}

// Duration calculation (from sessionStats.ts)
function getDurationHours(session: Session): number {
  const start = new Date(session.started_at).getTime()
  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  const diffMs = end - start
  return +(diffMs / (1000 * 60 * 60)).toFixed(2)
}

// Session stats calculation (from sessionStats.ts)
function calculateSessionStats(session: Session, catches: Catch[]): SessionStats {
  const total_catches = catches.length

  let total_weight_kg = 0
  let biggest_catch: Catch | null = null
  const species_breakdown: Record<string, number> = {}

  for (const c of catches) {
    if (c.weight_kg != null) {
      total_weight_kg += c.weight_kg
      if (!biggest_catch || (biggest_catch.weight_kg ?? 0) < c.weight_kg) {
        biggest_catch = c
      }
    }

    if (c.species) {
      species_breakdown[c.species] = (species_breakdown[c.species] ?? 0) + 1
    }
  }

  return {
    total_catches,
    total_weight_kg: +total_weight_kg.toFixed(2),
    biggest_catch,
    species_breakdown,
    duration_hours: getDurationHours(session),
  }
}

// Privacy label helper
function getLocationPrivacyLabel(privacy: 'exact' | 'approximate' | 'hidden'): string {
  switch (privacy) {
    case 'exact': return 'Exact location visible'
    case 'approximate': return 'Approximate area shown'
    case 'hidden': return 'Location hidden'
    default: return 'Unknown'
  }
}

// Session status helper
function getSessionStatus(session: Session): 'active' | 'completed' {
  return session.ended_at ? 'completed' : 'active'
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
    toBeCloseTo(expected: number, precision = 2) {
      if (typeof actual !== 'number') throw new Error(`Expected number, got ${typeof actual}`)
      const diff = Math.abs(actual - expected)
      if (diff > Math.pow(10, -precision)) {
        throw new Error(`Expected ${expected} ± ${Math.pow(10, -precision)}, got ${actual}`)
      }
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${actual}`)
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`)
      }
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    }
  }
}

console.log('\n📋 SESSION STATS & LOGIC TESTS\n')
console.log('='.repeat(50))

// Duration Tests
console.log('\n⏱️ Duration Calculation Tests:\n')

test('1 hour session = 1.0 hours', () => {
  const session: Session = {
    id: '1',
    started_at: '2025-01-01T10:00:00Z',
    ended_at: '2025-01-01T11:00:00Z'
  }
  expect(getDurationHours(session)).toBe(1)
})

test('2.5 hour session = 2.5 hours', () => {
  const session: Session = {
    id: '1',
    started_at: '2025-01-01T10:00:00Z',
    ended_at: '2025-01-01T12:30:00Z'
  }
  expect(getDurationHours(session)).toBe(2.5)
})

test('30 minute session = 0.5 hours', () => {
  const session: Session = {
    id: '1',
    started_at: '2025-01-01T10:00:00Z',
    ended_at: '2025-01-01T10:30:00Z'
  }
  expect(getDurationHours(session)).toBe(0.5)
})

test('Invalid dates return 0', () => {
  const session: Session = {
    id: '1',
    started_at: 'invalid',
    ended_at: '2025-01-01T11:00:00Z'
  }
  expect(getDurationHours(session)).toBe(0)
})

test('End before start returns 0', () => {
  const session: Session = {
    id: '1',
    started_at: '2025-01-01T12:00:00Z',
    ended_at: '2025-01-01T10:00:00Z'
  }
  expect(getDurationHours(session)).toBe(0)
})

// Stats Calculation Tests
console.log('\n📊 Stats Calculation Tests:\n')

test('Empty catches = 0 stats', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T11:00:00Z' }
  const stats = calculateSessionStats(session, [])
  expect(stats.total_catches).toBe(0)
  expect(stats.total_weight_kg).toBe(0)
  expect(stats.biggest_catch).toBeNull()
  expect(stats.duration_hours).toBe(1)
})

test('Single catch with weight', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' }
  const catches: Catch[] = [{ id: 'c1', species: 'Bass', weight_kg: 2.5 }]
  const stats = calculateSessionStats(session, catches)
  expect(stats.total_catches).toBe(1)
  expect(stats.total_weight_kg).toBe(2.5)
  expect(stats.biggest_catch?.species).toBe('Bass')
})

test('Multiple catches - correct total weight', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' }
  const catches: Catch[] = [
    { id: 'c1', species: 'Bass', weight_kg: 2.5 },
    { id: 'c2', species: 'Cod', weight_kg: 3.0 },
    { id: 'c3', species: 'Mackerel', weight_kg: 0.5 }
  ]
  const stats = calculateSessionStats(session, catches)
  expect(stats.total_catches).toBe(3)
  expect(stats.total_weight_kg).toBe(6)
})

test('Biggest catch identified correctly', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' }
  const catches: Catch[] = [
    { id: 'c1', species: 'Bass', weight_kg: 2.5 },
    { id: 'c2', species: 'Cod', weight_kg: 5.0 },
    { id: 'c3', species: 'Mackerel', weight_kg: 0.5 }
  ]
  const stats = calculateSessionStats(session, catches)
  expect(stats.biggest_catch?.id).toBe('c2')
  expect(stats.biggest_catch?.weight_kg).toBe(5)
})

test('Species breakdown counts correctly', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' }
  const catches: Catch[] = [
    { id: 'c1', species: 'Bass', weight_kg: 2.5 },
    { id: 'c2', species: 'Mackerel', weight_kg: 0.5 },
    { id: 'c3', species: 'Mackerel', weight_kg: 0.6 },
    { id: 'c4', species: 'Mackerel', weight_kg: 0.4 }
  ]
  const stats = calculateSessionStats(session, catches)
  expect(stats.species_breakdown['Bass']).toBe(1)
  expect(stats.species_breakdown['Mackerel']).toBe(3)
})

test('Catches without weight still count', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' }
  const catches: Catch[] = [
    { id: 'c1', species: 'Bass', weight_kg: null },
    { id: 'c2', species: 'Cod', weight_kg: 3.0 }
  ]
  const stats = calculateSessionStats(session, catches)
  expect(stats.total_catches).toBe(2)
  expect(stats.total_weight_kg).toBe(3)
})

// Privacy Tests
console.log('\n🔒 Privacy Label Tests:\n')

test('Exact privacy label', () => {
  expect(getLocationPrivacyLabel('exact')).toBe('Exact location visible')
})

test('Approximate privacy label', () => {
  expect(getLocationPrivacyLabel('approximate')).toBe('Approximate area shown')
})

test('Hidden privacy label', () => {
  expect(getLocationPrivacyLabel('hidden')).toBe('Location hidden')
})

// Session Status Tests
console.log('\n🔄 Session Status Tests:\n')

test('Session with ended_at is completed', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' }
  expect(getSessionStatus(session)).toBe('completed')
})

test('Session without ended_at is active', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: null }
  expect(getSessionStatus(session)).toBe('active')
})

// Edge Cases
console.log('\n⚠️ Edge Case Tests:\n')

test('Very long session (24 hours)', () => {
  const session: Session = {
    id: '1',
    started_at: '2025-01-01T00:00:00Z',
    ended_at: '2025-01-02T00:00:00Z'
  }
  expect(getDurationHours(session)).toBe(24)
})

test('Weight precision maintained (0.15 kg)', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' }
  const catches: Catch[] = [
    { id: 'c1', species: 'Mackerel', weight_kg: 0.15 }
  ]
  const stats = calculateSessionStats(session, catches)
  expect(stats.total_weight_kg).toBe(0.15)
})

test('Many species tracked correctly', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' }
  const catches: Catch[] = [
    { id: 'c1', species: 'Bass', weight_kg: 1 },
    { id: 'c2', species: 'Cod', weight_kg: 1 },
    { id: 'c3', species: 'Mackerel', weight_kg: 1 },
    { id: 'c4', species: 'Pollock', weight_kg: 1 },
    { id: 'c5', species: 'Whiting', weight_kg: 1 }
  ]
  const stats = calculateSessionStats(session, catches)
  expect(Object.keys(stats.species_breakdown).length).toBe(5)
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`\n📋 RESULTS: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}
