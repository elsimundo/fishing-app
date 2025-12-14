/**
 * Logbook Page Logic Tests
 * Run with: npx tsx src/hooks/logbook.test.ts
 */

// Types
interface Catch {
  id: string
  species: string
  weight_kg: number | null
  length_cm: number | null
}

interface SessionStats {
  total_catches: number
  total_weight_kg: number
  biggest_catch: Catch | null
  species_breakdown: Record<string, number>
}

interface Session {
  id: string
  catches: Catch[]
  stats: SessionStats
}

interface UserChallenge {
  id: string
  challenge_id: string
  progress: number
  target: number
  completed_at: string | null
}

// Calculate total weight across sessions
function calculateTotalWeight(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + s.stats.total_weight_kg, 0)
}

// Find personal best (heaviest catch)
function findPersonalBest(sessions: Session[]): Catch | null {
  const allCatches = sessions.flatMap(s => s.catches)
  return allCatches.reduce<Catch | null>((best, c) => {
    if (c.weight_kg == null) return best
    if (!best || (best.weight_kg ?? 0) < c.weight_kg) return c
    return best
  }, null)
}

// Format personal best label
function formatPersonalBest(catch_: Catch | null): string {
  if (!catch_ || catch_.weight_kg == null) return '—'
  const lengthPart = catch_.length_cm != null ? ` · ${catch_.length_cm.toFixed(0)} cm` : ''
  return `${catch_.weight_kg.toFixed(1)} kg · ${catch_.species}${lengthPart}`
}

// Calculate top species across sessions
function calculateTopSpecies(sessions: Session[]): { name: string; count: number } | null {
  const speciesCounts: Record<string, number> = {}
  
  for (const session of sessions) {
    for (const [species, count] of Object.entries(session.stats.species_breakdown)) {
      speciesCounts[species] = (speciesCounts[species] ?? 0) + count
    }
  }
  
  const sorted = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null
  
  return { name: sorted[0][0], count: sorted[0][1] }
}

// Format top species label
function formatTopSpecies(topSpecies: { name: string; count: number } | null): string {
  if (!topSpecies) return '—'
  return `${topSpecies.name} (${topSpecies.count})`
}

// Count completed challenges
function countCompletedChallenges(challenges: UserChallenge[]): number {
  return challenges.filter(c => c.completed_at !== null).length
}

// Calculate challenge progress percentage
function calculateChallengeProgress(challenge: UserChallenge | undefined): number {
  if (!challenge) return 0
  return Math.min(100, Math.round((challenge.progress / (challenge.target || 1)) * 100))
}

// Get fishing preference label
function getPreferenceLabel(preference: string): string {
  const labels: Record<string, string> = {
    sea: 'Sea Fishing',
    freshwater: 'Freshwater Fishing',
    both: 'All Fishing',
  }
  return labels[preference] ?? 'Unknown'
}

// Validate tab is allowed
function isValidTab(tab: string): boolean {
  const validTabs = ['posts', 'sessions', 'catches', 'species', 'achievements']
  return validTabs.includes(tab)
}

// Get empty state message for tab
function getEmptyStateMessage(tab: string): string {
  switch (tab) {
    case 'posts':
      return 'No posts yet'
    case 'sessions':
      return 'No sessions logged'
    case 'catches':
      return 'No catches logged'
    case 'species':
      return 'Catch some fish to build your collection'
    case 'achievements':
      return 'Complete challenges to earn badges'
    default:
      return 'Nothing to show'
  }
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

console.log('\n📔 LOGBOOK PAGE LOGIC TESTS\n')
console.log('='.repeat(50))

// Sample data
const sampleSessions: Session[] = [
  {
    id: '1',
    catches: [
      { id: 'c1', species: 'Bass', weight_kg: 2.5, length_cm: 35 },
      { id: 'c2', species: 'Mackerel', weight_kg: 0.5, length_cm: 25 }
    ],
    stats: {
      total_catches: 2,
      total_weight_kg: 3.0,
      biggest_catch: { id: 'c1', species: 'Bass', weight_kg: 2.5, length_cm: 35 },
      species_breakdown: { 'Bass': 1, 'Mackerel': 1 }
    }
  },
  {
    id: '2',
    catches: [
      { id: 'c3', species: 'Cod', weight_kg: 5.0, length_cm: 50 },
      { id: 'c4', species: 'Mackerel', weight_kg: 0.6, length_cm: 26 },
      { id: 'c5', species: 'Mackerel', weight_kg: 0.4, length_cm: 24 }
    ],
    stats: {
      total_catches: 3,
      total_weight_kg: 6.0,
      biggest_catch: { id: 'c3', species: 'Cod', weight_kg: 5.0, length_cm: 50 },
      species_breakdown: { 'Cod': 1, 'Mackerel': 2 }
    }
  }
]

// Total Weight Tests
console.log('\n⚖️ Total Weight Tests:\n')

test('Total weight sums all sessions', () => {
  expect(calculateTotalWeight(sampleSessions)).toBe(9)
})

test('Empty sessions = 0 weight', () => {
  expect(calculateTotalWeight([])).toBe(0)
})

test('Single session weight', () => {
  expect(calculateTotalWeight([sampleSessions[0]])).toBe(3)
})

// Personal Best Tests
console.log('\n🏆 Personal Best Tests:\n')

test('Finds heaviest catch across sessions', () => {
  const best = findPersonalBest(sampleSessions)
  expect(best?.species).toBe('Cod')
  expect(best?.weight_kg).toBe(5)
})

test('Empty sessions returns null', () => {
  expect(findPersonalBest([])).toBeNull()
})

test('Formats personal best with length', () => {
  const catch_ = { id: '1', species: 'Bass', weight_kg: 2.5, length_cm: 35 }
  expect(formatPersonalBest(catch_)).toBe('2.5 kg · Bass · 35 cm')
})

test('Formats personal best without length', () => {
  const catch_ = { id: '1', species: 'Bass', weight_kg: 2.5, length_cm: null }
  expect(formatPersonalBest(catch_)).toBe('2.5 kg · Bass')
})

test('Null catch returns dash', () => {
  expect(formatPersonalBest(null)).toBe('—')
})

// Top Species Tests
console.log('\n🐟 Top Species Tests:\n')

test('Finds most caught species', () => {
  const top = calculateTopSpecies(sampleSessions)
  expect(top?.name).toBe('Mackerel')
  expect(top?.count).toBe(3)
})

test('Empty sessions returns null', () => {
  expect(calculateTopSpecies([])).toBeNull()
})

test('Formats top species label', () => {
  expect(formatTopSpecies({ name: 'Mackerel', count: 3 })).toBe('Mackerel (3)')
})

test('Null returns dash', () => {
  expect(formatTopSpecies(null)).toBe('—')
})

// Challenge Tests
console.log('\n🎯 Challenge Tests:\n')

const sampleChallenges: UserChallenge[] = [
  { id: '1', challenge_id: 'a', progress: 5, target: 10, completed_at: null },
  { id: '2', challenge_id: 'b', progress: 10, target: 10, completed_at: '2025-01-01' },
  { id: '3', challenge_id: 'c', progress: 3, target: 5, completed_at: '2025-01-02' }
]

test('Counts completed challenges', () => {
  expect(countCompletedChallenges(sampleChallenges)).toBe(2)
})

test('Empty challenges = 0 completed', () => {
  expect(countCompletedChallenges([])).toBe(0)
})

test('Challenge progress 50%', () => {
  expect(calculateChallengeProgress(sampleChallenges[0])).toBe(50)
})

test('Challenge progress 100% (capped)', () => {
  expect(calculateChallengeProgress(sampleChallenges[1])).toBe(100)
})

test('Undefined challenge = 0%', () => {
  expect(calculateChallengeProgress(undefined)).toBe(0)
})

// Preference Labels Tests
console.log('\n🎣 Preference Labels Tests:\n')

test('Sea preference label', () => {
  expect(getPreferenceLabel('sea')).toBe('Sea Fishing')
})

test('Freshwater preference label', () => {
  expect(getPreferenceLabel('freshwater')).toBe('Freshwater Fishing')
})

test('Both preference label', () => {
  expect(getPreferenceLabel('both')).toBe('All Fishing')
})

test('Unknown preference', () => {
  expect(getPreferenceLabel('other')).toBe('Unknown')
})

// Tab Validation Tests
console.log('\n📑 Tab Validation Tests:\n')

test('Posts tab is valid', () => {
  expect(isValidTab('posts')).toBeTrue()
})

test('Sessions tab is valid', () => {
  expect(isValidTab('sessions')).toBeTrue()
})

test('Catches tab is valid', () => {
  expect(isValidTab('catches')).toBeTrue()
})

test('Species tab is valid', () => {
  expect(isValidTab('species')).toBeTrue()
})

test('Achievements tab is valid', () => {
  expect(isValidTab('achievements')).toBeTrue()
})

test('Invalid tab rejected', () => {
  expect(isValidTab('invalid')).toBeFalse()
})

// Empty State Messages
console.log('\n📭 Empty State Messages:\n')

test('Posts empty state', () => {
  expect(getEmptyStateMessage('posts')).toBe('No posts yet')
})

test('Sessions empty state', () => {
  expect(getEmptyStateMessage('sessions')).toBe('No sessions logged')
})

test('Catches empty state', () => {
  expect(getEmptyStateMessage('catches')).toBe('No catches logged')
})

test('Species empty state', () => {
  expect(getEmptyStateMessage('species')).toBe('Catch some fish to build your collection')
})

test('Achievements empty state', () => {
  expect(getEmptyStateMessage('achievements')).toBe('Complete challenges to earn badges')
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`\n📋 RESULTS: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}
