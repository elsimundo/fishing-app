/**
 * Gamification Logic Tests
 */
import { describe, it, expect } from 'vitest'

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
  if (currentLevel < XP_THRESHOLDS.length) return XP_THRESHOLDS[currentLevel]
  return 2300 + (currentLevel - 10) * 600
}

function xpProgress(xp: number, level: number): { current: number; needed: number; percentage: number } {
  const xpForCurrent = level > 1 ? xpForNextLevel(level - 1) : 0
  const xpForNext = xpForNextLevel(level)
  const current = xp - xpForCurrent
  const needed = xpForNext - xpForCurrent
  return { current, needed, percentage: Math.min(100, Math.round((current / needed) * 100)) }
}

describe('Level Calculation', () => {
  it('Level 1 at 0 XP', () => expect(calculateLevel(0)).toBe(1))
  it('Level 1 at 49 XP', () => expect(calculateLevel(49)).toBe(1))
  it('Level 2 at 50 XP', () => expect(calculateLevel(50)).toBe(2))
  it('Level 2 at 119 XP', () => expect(calculateLevel(119)).toBe(2))
  it('Level 3 at 120 XP', () => expect(calculateLevel(120)).toBe(3))
  it('Level 5 at 350 XP', () => expect(calculateLevel(350)).toBe(5))
  it('Level 10 at 2300 XP', () => expect(calculateLevel(2300)).toBe(10))
  it('Level 11 at 2900 XP', () => expect(calculateLevel(2900)).toBe(11))
  it('Level 12 at 3500 XP', () => expect(calculateLevel(3500)).toBe(12))
  it('Negative XP returns level 1', () => expect(calculateLevel(-100)).toBe(1))
  it('Very high XP calculates correctly', () => expect(calculateLevel(100000)).toBeGreaterThan(100))
})

describe('XP Thresholds', () => {
  it('XP for level 1 is 50', () => expect(xpForNextLevel(1)).toBe(50))
  it('XP for level 2 is 120', () => expect(xpForNextLevel(2)).toBe(120))
  it('XP for level 5 is 520', () => expect(xpForNextLevel(5)).toBe(520))
  it('XP for level 10 is 2300', () => expect(xpForNextLevel(10)).toBe(2300))
  it('XP for level 11 is 2900', () => expect(xpForNextLevel(11)).toBe(2900))
})

describe('XP Progress', () => {
  it('Progress at 0 XP shows 0/50', () => {
    const prog = xpProgress(0, 1)
    expect(prog.current).toBe(0)
    expect(prog.needed).toBe(50)
    expect(prog.percentage).toBe(0)
  })

  it('Progress at 25 XP shows 25/50 (50%)', () => {
    const prog = xpProgress(25, 1)
    expect(prog.current).toBe(25)
    expect(prog.percentage).toBe(50)
  })

  it('Progress at 50 XP (level 2) shows 0/70', () => {
    const prog = xpProgress(50, 2)
    expect(prog.current).toBe(0)
    expect(prog.needed).toBe(70)
  })

  it('Percentage never exceeds 100', () => {
    const prog = xpProgress(10000, 1)
    expect(prog.percentage).toBeLessThanOrEqual(100)
  })
})
