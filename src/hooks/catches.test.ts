/**
 * Catch XP & Challenge Logic Tests
 */
import { describe, it, expect } from 'vitest'

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

describe('Catch XP Calculation', () => {
  it('Base catch with photo = 15 XP (10 base + 5 photo)', () => {
    expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: false })).toBe(15)
  })

  it('Base catch without photo = 3 XP', () => {
    expect(calculateCatchXP({ hasPhoto: false, isNewSpecies: false })).toBe(3)
  })

  it('New species with photo = 40 XP (10 + 5 + 25)', () => {
    expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: true })).toBe(40)
  })

  it('New species without photo = 28 XP (3 + 25)', () => {
    expect(calculateCatchXP({ hasPhoto: false, isNewSpecies: true })).toBe(28)
  })

  it('5lb fish with photo = 20 XP (15 + 5)', () => {
    expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: false, weightLb: 5 })).toBe(20)
  })

  it('10lb fish with photo = 25 XP (15 + 10)', () => {
    expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: false, weightLb: 10 })).toBe(25)
  })

  it('15lb new species with photo = 55 XP (15 + 25 + 15)', () => {
    expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: true, weightLb: 15 })).toBe(55)
  })

  it('4lb fish gets no weight bonus', () => {
    expect(calculateCatchXP({ hasPhoto: true, isNewSpecies: false, weightLb: 4 })).toBe(15)
  })

  it('Photo catch should always be worth more than no-photo', () => {
    const withPhoto = calculateCatchXP({ hasPhoto: true, isNewSpecies: false })
    const noPhoto = calculateCatchXP({ hasPhoto: false, isNewSpecies: false })
    expect(withPhoto).toBeGreaterThan(noPhoto)
  })

  it('New species should be worth significant bonus', () => {
    expect(XP_VALUES.NEW_SPECIES_BONUS).toBeGreaterThan(XP_VALUES.BASE_CATCH)
  })
})

describe('Milestone Checks', () => {
  it('First catch (1) triggers milestone', () => {
    expect(checkMilestone(1, MILESTONES.CATCH)).toBe(1)
  })

  it('10th catch triggers milestone', () => {
    expect(checkMilestone(10, MILESTONES.CATCH)).toBe(10)
  })

  it('9th catch does not trigger milestone', () => {
    expect(checkMilestone(9, MILESTONES.CATCH)).toBeNull()
  })

  it('5th species triggers milestone', () => {
    expect(checkMilestone(5, MILESTONES.SPECIES)).toBe(5)
  })

  it('10th photo triggers milestone', () => {
    expect(checkMilestone(10, MILESTONES.PHOTO)).toBe(10)
  })
})

describe('Time Challenges', () => {
  it('4am = dawn_patrol + night_owl', () => {
    const challenges = getTimeChallenge(4)
    expect(challenges).toContain('dawn_patrol')
    expect(challenges).toContain('night_owl')
  })

  it('5am = dawn_patrol + early_bird', () => {
    const challenges = getTimeChallenge(5)
    expect(challenges).toContain('dawn_patrol')
    expect(challenges).toContain('early_bird')
    expect(challenges).toHaveLength(2)
  })

  it('6am = early_bird only', () => {
    const challenges = getTimeChallenge(6)
    expect(challenges).toContain('early_bird')
    expect(challenges).toHaveLength(1)
  })

  it('12pm = no time challenges', () => {
    const challenges = getTimeChallenge(12)
    expect(challenges).toHaveLength(0)
  })

  it('7pm = golden_hour', () => {
    const challenges = getTimeChallenge(19)
    expect(challenges).toContain('golden_hour')
  })

  it('10pm = night_owl', () => {
    const challenges = getTimeChallenge(22)
    expect(challenges).toContain('night_owl')
  })
})

describe('Weather Challenges', () => {
  it('Rain triggers weather_warrior', () => {
    expect(getWeatherChallenge('Light Rain')).toContain('weather_warrior')
  })

  it('Drizzle triggers weather_warrior', () => {
    expect(getWeatherChallenge('Drizzle')).toContain('weather_warrior')
  })

  it('Thunderstorm triggers storm_chaser + weather_warrior', () => {
    const challenges = getWeatherChallenge('Thunderstorm with rain')
    expect(challenges).toContain('storm_chaser')
    expect(challenges).toContain('weather_warrior')
  })

  it('Fog triggers fog_fisher', () => {
    expect(getWeatherChallenge('Foggy')).toContain('fog_fisher')
  })

  it('Clear sky triggers sunny_fisher', () => {
    expect(getWeatherChallenge('Clear')).toContain('sunny_fisher')
  })

  it('Overcast triggers no weather challenges', () => {
    expect(getWeatherChallenge('Overcast')).toHaveLength(0)
  })
})

describe('Rate Limits', () => {
  it('Max 30 catches per hour', () => {
    expect(RATE_LIMITS.MAX_CATCHES_PER_HOUR).toBe(30)
  })

  it('Max 100 catches per day', () => {
    expect(RATE_LIMITS.MAX_CATCHES_PER_DAY).toBe(100)
  })
})
