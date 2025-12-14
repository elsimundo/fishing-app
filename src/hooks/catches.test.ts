/**
 * Catch XP & Challenge Logic Tests
 * Run with: npx tsx src/hooks/catches.test.ts
 */

// XP Values (from useCatchXP.ts)
const XP_VALUES = {
  BASE_CATCH: 10,
  BASE_CATCH_NO_PHOTO: 3,
  PHOTO_BONUS: 5,
  WEIGHT_BONUS_PER_5LB: 5,
  NEW_SPECIES_BONUS: 25,
}

const RATE_LIMITS = {
  MAX_CATCHES_PER_HOUR: 30,
  MAX_CATCHES_PER_DAY: 100,
}

// Milestone thresholds
const MILESTONES = {
  CATCH: [1, 10, 50, 100, 500],
  SPECIES: [5, 10, 25],
  PHOTO: [10, 50],
  LOCATION: [5, 10, 25],
}

// Calculate XP for a catch
function calculateCatchXP(options: {
  hasPhoto: boolean
  isNewSpecies: boolean
  weightLb?: number
}): number {
  let xp = options.hasPhoto ? XP_VALUES.BASE_CATCH : XP_VALUES.BASE_CATCH_NO_PHOTO
  
  if (options.hasPhoto) {
    xp += XP_VALUES.PHOTO_BONUS
  }
  
  if (options.isNewSpecies) {
    xp += XP_VALUES.NEW_SPECIES_BONUS
  }
  
  if (options.weightLb && options.weightLb > 0) {
    const weightBonusMultiplier = Math.floor(options.weightLb / 5)
    xp += weightBonusMultiplier * XP_VALUES.WEIGHT_BONUS_PER_5LB
  }
  
  return xp
}

// Check if milestone is reached
function checkMilestone(count: number, milestones: number[]): number | null {
  for (const m of milestones) {
    if (count === m) return m
  }
  return null
}

// Check time-based challenge eligibility
function getTimeChallenge(hour: number): string[] {
  const challenges: string[] = []
  
  if (hour >= 4 && hour < 6) challenges.push('dawn_patrol')
  if (hour >= 5 && hour < 7) challenges.push('early_bird')
  if (hour >= 22 || hour < 5) challenges.push('night_owl')
  if (hour >= 18 && hour < 20) challenges.push('golden_hour')
  
  return challenges
}

// Check weather challenge eligibility
function getWeatherChallenge(condition: string): string[] {
  const lower = condition.toLowerCase()
  const challenges: string[] = []
  
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    challenges.push('weather_warrior')
  }
  if (lower.includes('thunder') || lower.includes('storm')) {
    challenges.push('storm_chaser')
  }
  if (lower.includes('fog') || lower.includes('mist')) {
    challenges.push('fog_fisher')
  }
  if (lower.includes('clear') || lower.includes('sunny')) {
    challenges.push('sunny_fisher')
  }
  
  return challenges
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
    toContain(expected: string) {
      if (!Array.isArray(actual) || !actual.includes(expected)) {
        throw new Error(`Expected array to contain "${expected}", got ${JSON.stringify(actual)}`)
      }
    },
    toHaveLength(expected: number) {
      if (!Array.isArray(actual) || actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${Array.isArray(actual) ? actual.length : 'non-array'}`)
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`)
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`)
      }
    }
  }
}

console.log('\n🐟 CATCH XP & CHALLENGE TESTS\n')
console.log('='.repeat(50))

// XP Calculation Tests
console.log('\n💰 XP Calculation Tests:\n')

test('Base catch with photo = 15 XP (10 base + 5 photo)', () => {
  expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: false })).toBe(15)
})

test('Base catch without photo = 3 XP', () => {
  expect(calculateCatchXP({ hasPhoto: false, isNewSpecies: false })).toBe(3)
})

test('New species with photo = 40 XP (10 + 5 + 25)', () => {
  expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: true })).toBe(40)
})

test('New species without photo = 28 XP (3 + 25)', () => {
  expect(calculateCatchXP({ hasPhoto: false, isNewSpecies: true })).toBe(28)
})

test('5lb fish with photo = 20 XP (15 + 5)', () => {
  expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: false, weightLb: 5 })).toBe(20)
})

test('10lb fish with photo = 25 XP (15 + 10)', () => {
  expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: false, weightLb: 10 })).toBe(25)
})

test('15lb new species with photo = 55 XP (15 + 25 + 15)', () => {
  expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: true, weightLb: 15 })).toBe(55)
})

test('4lb fish gets no weight bonus', () => {
  expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: false, weightLb: 4 })).toBe(15)
})

// Milestone Tests
console.log('\n🏆 Milestone Tests:\n')

test('First catch (1) triggers milestone', () => {
  expect(checkMilestone(1, MILESTONES.CATCH)).toBe(1)
})

test('10th catch triggers milestone', () => {
  expect(checkMilestone(10, MILESTONES.CATCH)).toBe(10)
})

test('9th catch does not trigger milestone', () => {
  expect(checkMilestone(9, MILESTONES.CATCH)).toBeNull()
})

test('5th species triggers milestone', () => {
  expect(checkMilestone(5, MILESTONES.SPECIES)).toBe(5)
})

test('10th photo triggers milestone', () => {
  expect(checkMilestone(10, MILESTONES.PHOTO)).toBe(10)
})

// Time Challenge Tests
console.log('\n⏰ Time Challenge Tests:\n')

test('4am = dawn_patrol + night_owl', () => {
  const challenges = getTimeChallenge(4)
  expect(challenges).toContain('dawn_patrol')
  expect(challenges).toContain('night_owl')
})

test('5am = dawn_patrol + early_bird (night_owl ends at 5am)', () => {
  const challenges = getTimeChallenge(5)
  expect(challenges).toContain('dawn_patrol')
  expect(challenges).toContain('early_bird')
  expect(challenges).toHaveLength(2)
})

test('6am = early_bird only', () => {
  const challenges = getTimeChallenge(6)
  expect(challenges).toContain('early_bird')
  expect(challenges).toHaveLength(1)
})

test('12pm = no time challenges', () => {
  const challenges = getTimeChallenge(12)
  expect(challenges).toHaveLength(0)
})

test('7pm = golden_hour', () => {
  const challenges = getTimeChallenge(19)
  expect(challenges).toContain('golden_hour')
})

test('10pm = night_owl', () => {
  const challenges = getTimeChallenge(22)
  expect(challenges).toContain('night_owl')
})

// Weather Challenge Tests
console.log('\n🌦️ Weather Challenge Tests:\n')

test('Rain triggers weather_warrior', () => {
  expect(getWeatherChallenge('Light Rain')).toContain('weather_warrior')
})

test('Drizzle triggers weather_warrior', () => {
  expect(getWeatherChallenge('Drizzle')).toContain('weather_warrior')
})

test('Thunderstorm triggers storm_chaser + weather_warrior', () => {
  const challenges = getWeatherChallenge('Thunderstorm with rain')
  expect(challenges).toContain('storm_chaser')
  expect(challenges).toContain('weather_warrior')
})

test('Fog triggers fog_fisher', () => {
  expect(getWeatherChallenge('Foggy')).toContain('fog_fisher')
})

test('Clear sky triggers sunny_fisher', () => {
  expect(getWeatherChallenge('Clear')).toContain('sunny_fisher')
})

test('Sunny triggers sunny_fisher', () => {
  expect(getWeatherChallenge('Sunny')).toContain('sunny_fisher')
})

test('Overcast triggers no weather challenges', () => {
  expect(getWeatherChallenge('Overcast')).toHaveLength(0)
})

// Rate Limit Tests
console.log('\n⚠️ Rate Limit Tests:\n')

test('Rate limit: 30 catches per hour', () => {
  expect(RATE_LIMITS.MAX_CATCHES_PER_HOUR).toBe(30)
})

test('Rate limit: 100 catches per day', () => {
  expect(RATE_LIMITS.MAX_CATCHES_PER_DAY).toBe(100)
})

// XP Value Sanity Tests
console.log('\n🔢 XP Value Sanity Tests:\n')

test('Photo catch should always be worth more than no-photo', () => {
  const withPhoto = calculateCatchXP({ hasPhoto: true, isNewSpecies: false })
  const noPhoto = calculateCatchXP({ hasPhoto: false, isNewSpecies: false })
  expect(withPhoto).toBeGreaterThan(noPhoto)
})

test('New species should be worth significant bonus', () => {
  expect(XP_VALUES.NEW_SPECIES_BONUS).toBeGreaterThan(XP_VALUES.BASE_CATCH)
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`\n📋 RESULTS: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}
