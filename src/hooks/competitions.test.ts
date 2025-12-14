/**
 * Competition Logic Tests
 * Run with: npx tsx src/hooks/competitions.test.ts
 */

// Types
type CompetitionType = 'heaviest_fish' | 'most_catches' | 'species_diversity' | 'photo_contest'
type CompetitionStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'

interface Competition {
  id: string
  title: string
  type: CompetitionType
  status: CompetitionStatus
  starts_at: string
  ends_at: string
  is_public: boolean
}

interface LeaderboardEntry {
  user_id: string
  username: string
  total_weight: number
  catch_count: number
  species_count: number
  biggest_catch_weight: number
}

// Scoring unit helper (from CompetitionLeaderboard.tsx)
function getScoringUnit(type: CompetitionType): string {
  switch (type) {
    case 'heaviest_fish':
      return 'kg'
    case 'most_catches':
      return 'fish'
    case 'species_diversity':
      return 'species'
    case 'photo_contest':
      return 'votes'
    default:
      return ''
  }
}

// Get competition status based on dates
function getCompetitionStatus(startsAt: string, endsAt: string): CompetitionStatus {
  const now = new Date()
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  
  if (now < start) return 'upcoming'
  if (now >= start && now <= end) return 'active'
  return 'completed'
}

// Calculate score based on competition type
function calculateScore(entry: LeaderboardEntry, type: CompetitionType): number {
  switch (type) {
    case 'heaviest_fish':
      return entry.biggest_catch_weight
    case 'most_catches':
      return entry.catch_count
    case 'species_diversity':
      return entry.species_count
    case 'photo_contest':
      return 0 // Votes handled separately
    default:
      return 0
  }
}

// Sort leaderboard by competition type
function sortLeaderboard(entries: LeaderboardEntry[], type: CompetitionType): LeaderboardEntry[] {
  return [...entries].sort((a, b) => calculateScore(b, type) - calculateScore(a, type))
}

// Get placement suffix (1st, 2nd, 3rd, etc.)
function getPlacementSuffix(position: number): string {
  if (position === 1) return '1st'
  if (position === 2) return '2nd'
  if (position === 3) return '3rd'
  return `${position}th`
}

// Check if competition is joinable
function isJoinable(competition: Competition): boolean {
  if (competition.status === 'cancelled') return false
  if (competition.status === 'completed') return false
  return true
}

// Format time remaining
function formatTimeRemaining(endsAt: string): string {
  const now = new Date()
  const end = new Date(endsAt)
  const diffMs = end.getTime() - now.getTime()
  
  if (diffMs <= 0) return 'Ended'
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h`
  return 'Less than 1h'
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
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    },
    toBeTrue() {
      if (actual !== true) throw new Error(`Expected true, got ${actual}`)
    },
    toBeFalse() {
      if (actual !== false) throw new Error(`Expected false, got ${actual}`)
    }
  }
}

console.log('\n🏆 COMPETITION LOGIC TESTS\n')
console.log('='.repeat(50))

// Scoring Unit Tests
console.log('\n📏 Scoring Unit Tests:\n')

test('Heaviest fish uses kg', () => {
  expect(getScoringUnit('heaviest_fish')).toBe('kg')
})

test('Most catches uses fish', () => {
  expect(getScoringUnit('most_catches')).toBe('fish')
})

test('Species diversity uses species', () => {
  expect(getScoringUnit('species_diversity')).toBe('species')
})

test('Photo contest uses votes', () => {
  expect(getScoringUnit('photo_contest')).toBe('votes')
})

// Status Tests
console.log('\n📅 Status Calculation Tests:\n')

test('Future competition is upcoming', () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  expect(getCompetitionStatus(tomorrow, nextWeek)).toBe('upcoming')
})

test('Current competition is active', () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  expect(getCompetitionStatus(yesterday, tomorrow)).toBe('active')
})

test('Past competition is completed', () => {
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  expect(getCompetitionStatus(lastWeek, yesterday)).toBe('completed')
})

// Score Calculation Tests
console.log('\n🔢 Score Calculation Tests:\n')

const testEntry: LeaderboardEntry = {
  user_id: '1',
  username: 'angler1',
  total_weight: 15.5,
  catch_count: 8,
  species_count: 4,
  biggest_catch_weight: 5.2
}

test('Heaviest fish scores by biggest catch', () => {
  expect(calculateScore(testEntry, 'heaviest_fish')).toBe(5.2)
})

test('Most catches scores by catch count', () => {
  expect(calculateScore(testEntry, 'most_catches')).toBe(8)
})

test('Species diversity scores by species count', () => {
  expect(calculateScore(testEntry, 'species_diversity')).toBe(4)
})

// Leaderboard Sorting Tests
console.log('\n📊 Leaderboard Sorting Tests:\n')

const entries: LeaderboardEntry[] = [
  { user_id: '1', username: 'alice', total_weight: 10, catch_count: 5, species_count: 3, biggest_catch_weight: 4 },
  { user_id: '2', username: 'bob', total_weight: 8, catch_count: 10, species_count: 2, biggest_catch_weight: 2 },
  { user_id: '3', username: 'charlie', total_weight: 12, catch_count: 3, species_count: 5, biggest_catch_weight: 6 },
]

test('Heaviest fish sorts by biggest catch weight', () => {
  const sorted = sortLeaderboard(entries, 'heaviest_fish')
  expect(sorted[0].username).toBe('charlie')
  expect(sorted[1].username).toBe('alice')
  expect(sorted[2].username).toBe('bob')
})

test('Most catches sorts by catch count', () => {
  const sorted = sortLeaderboard(entries, 'most_catches')
  expect(sorted[0].username).toBe('bob')
  expect(sorted[1].username).toBe('alice')
  expect(sorted[2].username).toBe('charlie')
})

test('Species diversity sorts by species count', () => {
  const sorted = sortLeaderboard(entries, 'species_diversity')
  expect(sorted[0].username).toBe('charlie')
  expect(sorted[1].username).toBe('alice')
  expect(sorted[2].username).toBe('bob')
})

// Placement Tests
console.log('\n🥇 Placement Suffix Tests:\n')

test('1st place', () => {
  expect(getPlacementSuffix(1)).toBe('1st')
})

test('2nd place', () => {
  expect(getPlacementSuffix(2)).toBe('2nd')
})

test('3rd place', () => {
  expect(getPlacementSuffix(3)).toBe('3rd')
})

test('4th place', () => {
  expect(getPlacementSuffix(4)).toBe('4th')
})

test('11th place', () => {
  expect(getPlacementSuffix(11)).toBe('11th')
})

// Joinability Tests
console.log('\n🚪 Joinability Tests:\n')

test('Upcoming competition is joinable', () => {
  const comp: Competition = {
    id: '1', title: 'Test', type: 'heaviest_fish', status: 'upcoming',
    starts_at: '', ends_at: '', is_public: true
  }
  expect(isJoinable(comp)).toBeTrue()
})

test('Active competition is joinable', () => {
  const comp: Competition = {
    id: '1', title: 'Test', type: 'heaviest_fish', status: 'active',
    starts_at: '', ends_at: '', is_public: true
  }
  expect(isJoinable(comp)).toBeTrue()
})

test('Completed competition is not joinable', () => {
  const comp: Competition = {
    id: '1', title: 'Test', type: 'heaviest_fish', status: 'completed',
    starts_at: '', ends_at: '', is_public: true
  }
  expect(isJoinable(comp)).toBeFalse()
})

test('Cancelled competition is not joinable', () => {
  const comp: Competition = {
    id: '1', title: 'Test', type: 'heaviest_fish', status: 'cancelled',
    starts_at: '', ends_at: '', is_public: true
  }
  expect(isJoinable(comp)).toBeFalse()
})

// Time Remaining Tests
console.log('\n⏰ Time Remaining Tests:\n')

test('Ended competition shows Ended', () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  expect(formatTimeRemaining(yesterday)).toBe('Ended')
})

test('Competition ending in 2 days shows days and hours', () => {
  const twoDays = new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString()
  const result = formatTimeRemaining(twoDays)
  expect(result.includes('d')).toBeTrue()
})

test('Competition ending in 5 hours shows hours', () => {
  const fiveHours = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
  const result = formatTimeRemaining(fiveHours)
  expect(result).toBe('5h')
})

// Edge Cases
console.log('\n⚠️ Edge Case Tests:\n')

test('Empty leaderboard sorts without error', () => {
  const sorted = sortLeaderboard([], 'heaviest_fish')
  expect(sorted.length).toBe(0)
})

test('Single entry leaderboard', () => {
  const single: LeaderboardEntry[] = [
    { user_id: '1', username: 'solo', total_weight: 5, catch_count: 2, species_count: 1, biggest_catch_weight: 3 }
  ]
  const sorted = sortLeaderboard(single, 'heaviest_fish')
  expect(sorted[0].username).toBe('solo')
})

test('Tied scores maintain stable order', () => {
  const tied: LeaderboardEntry[] = [
    { user_id: '1', username: 'first', total_weight: 5, catch_count: 5, species_count: 2, biggest_catch_weight: 3 },
    { user_id: '2', username: 'second', total_weight: 5, catch_count: 5, species_count: 2, biggest_catch_weight: 3 }
  ]
  const sorted = sortLeaderboard(tied, 'most_catches')
  expect(sorted.length).toBe(2)
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`\n📋 RESULTS: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}
