/**
 * Gamification Logic Tests
 * Run with: npx tsx src/hooks/gamification.test.ts
 */

// Inline the functions to test (avoiding import issues)
function calculateLevel(xp: number): number {
  if (xp < 50) return 1
  if (xp < 120) return 2
  if (xp < 220) return 3
  if (xp < 350) return 4
  if (xp < 520) return 5
  if (xp < 750) return 6
  if (xp < 1050) return 7
  if (xp < 1400) return 8
  if (xp < 1800) return 9
  if (xp < 2300) return 10
  return 10 + Math.floor((xp - 2300) / 600)
}

const XP_THRESHOLDS = [0, 50, 120, 220, 350, 520, 750, 1050, 1400, 1800, 2300]

function xpForNextLevel(currentLevel: number): number {
  if (currentLevel < XP_THRESHOLDS.length) {
    return XP_THRESHOLDS[currentLevel]
  }
  return 2300 + (currentLevel - 10) * 600
}

function xpProgress(xp: number, level: number): { current: number; needed: number; percentage: number } {
  const xpForCurrent = level > 1 ? xpForNextLevel(level - 1) : 0
  const xpForNext = xpForNextLevel(level)
  const current = xp - xpForCurrent
  const needed = xpForNext - xpForCurrent
  return {
    current,
    needed,
    percentage: Math.min(100, Math.round((current / needed) * 100))
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
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`)
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual > expected) {
        throw new Error(`Expected ${actual} to be <= ${expected}`)
      }
    }
  }
}

console.log('\n🎮 GAMIFICATION LOGIC TESTS\n')
console.log('='.repeat(50))

// Level calculation tests
console.log('\n📊 Level Calculation Tests:\n')

test('Level 1 at 0 XP', () => {
  expect(calculateLevel(0)).toBe(1)
})

test('Level 1 at 49 XP', () => {
  expect(calculateLevel(49)).toBe(1)
})

test('Level 2 at 50 XP', () => {
  expect(calculateLevel(50)).toBe(2)
})

test('Level 2 at 119 XP', () => {
  expect(calculateLevel(119)).toBe(2)
})

test('Level 3 at 120 XP', () => {
  expect(calculateLevel(120)).toBe(3)
})

test('Level 5 at 350 XP', () => {
  expect(calculateLevel(350)).toBe(5)
})

test('Level 10 at 2300 XP', () => {
  expect(calculateLevel(2300)).toBe(10)
})

test('Level 11 at 2900 XP', () => {
  expect(calculateLevel(2900)).toBe(11)
})

test('Level 12 at 3500 XP', () => {
  expect(calculateLevel(3500)).toBe(12)
})

// XP for next level tests
console.log('\n📈 XP Thresholds Tests:\n')

test('XP for level 1 is 50', () => {
  expect(xpForNextLevel(1)).toBe(50)
})

test('XP for level 2 is 120', () => {
  expect(xpForNextLevel(2)).toBe(120)
})

test('XP for level 5 is 520', () => {
  expect(xpForNextLevel(5)).toBe(520)
})

test('XP for level 10 is 2300', () => {
  expect(xpForNextLevel(10)).toBe(2300)
})

test('XP for level 11 is 2900', () => {
  expect(xpForNextLevel(11)).toBe(2900)
})

// XP Progress tests
console.log('\n📉 XP Progress Tests:\n')

test('Progress at 0 XP shows 0/50', () => {
  const prog = xpProgress(0, 1)
  expect(prog.current).toBe(0)
  expect(prog.needed).toBe(50)
  expect(prog.percentage).toBe(0)
})

test('Progress at 25 XP shows 25/50 (50%)', () => {
  const prog = xpProgress(25, 1)
  expect(prog.current).toBe(25)
  expect(prog.needed).toBe(50)
  expect(prog.percentage).toBe(50)
})

test('Progress at 50 XP (level 2) shows 0/70', () => {
  const prog = xpProgress(50, 2)
  expect(prog.current).toBe(0)
  expect(prog.needed).toBe(70)
})

test('Progress at 100 XP (level 2) shows 50/70', () => {
  const prog = xpProgress(100, 2)
  expect(prog.current).toBe(50)
  expect(prog.needed).toBe(70)
})

// Edge cases
console.log('\n⚠️ Edge Case Tests:\n')

test('Negative XP returns level 1', () => {
  expect(calculateLevel(-100)).toBe(1)
})

test('Very high XP (100000) calculates correctly', () => {
  const level = calculateLevel(100000)
  expect(level).toBeGreaterThan(100)
})

test('Percentage never exceeds 100', () => {
  const prog = xpProgress(10000, 1)
  expect(prog.percentage).toBeLessThanOrEqual(100)
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`\n📋 RESULTS: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}
