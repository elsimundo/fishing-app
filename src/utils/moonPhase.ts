/**
 * Moon phase calculation utility
 * Uses the synodic month (29.53 days) to calculate moon phases
 */

export type MoonPhase = 
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent'

export interface MoonPhaseData {
  phase: MoonPhase
  illumination: number // 0-100%
  emoji: string
  daysUntilFull: number
  daysUntilNew: number
  fishingRating: 'excellent' | 'good' | 'fair' | 'poor'
  fishingTip: string
}

// Known new moon date for reference (Jan 11, 2024 at 11:57 UTC)
const KNOWN_NEW_MOON = new Date('2024-01-11T11:57:00Z').getTime()
const SYNODIC_MONTH = 29.53058867 // days

/**
 * Calculate the moon phase for a given date
 */
export function getMoonPhase(date: Date = new Date()): MoonPhaseData {
  const timestamp = date.getTime()
  const daysSinceKnownNewMoon = (timestamp - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24)
  
  // Get position in current lunar cycle (0 to 1)
  const lunarAge = daysSinceKnownNewMoon % SYNODIC_MONTH
  const cyclePosition = lunarAge / SYNODIC_MONTH
  
  // Calculate illumination (0 at new moon, 100 at full moon)
  // Using cosine for smooth transition
  const illumination = Math.round((1 - Math.cos(cyclePosition * 2 * Math.PI)) * 50)
  
  // Determine phase name and emoji
  const { phase, emoji } = getPhaseNameAndEmoji(cyclePosition)
  
  // Calculate days until full and new moon
  const daysInCycle = lunarAge
  const daysUntilFull = daysInCycle < SYNODIC_MONTH / 2 
    ? Math.round((SYNODIC_MONTH / 2) - daysInCycle)
    : Math.round(SYNODIC_MONTH + (SYNODIC_MONTH / 2) - daysInCycle)
  const daysUntilNew = Math.round(SYNODIC_MONTH - daysInCycle)
  
  // Fishing rating based on moon phase
  const { fishingRating, fishingTip } = getFishingConditions(phase)
  
  return {
    phase,
    illumination,
    emoji,
    daysUntilFull,
    daysUntilNew,
    fishingRating,
    fishingTip,
  }
}

function getPhaseNameAndEmoji(cyclePosition: number): { phase: MoonPhase; emoji: string } {
  // Divide the cycle into 8 phases
  if (cyclePosition < 0.0625) {
    return { phase: 'New Moon', emoji: '🌑' }
  } else if (cyclePosition < 0.1875) {
    return { phase: 'Waxing Crescent', emoji: '🌒' }
  } else if (cyclePosition < 0.3125) {
    return { phase: 'First Quarter', emoji: '🌓' }
  } else if (cyclePosition < 0.4375) {
    return { phase: 'Waxing Gibbous', emoji: '🌔' }
  } else if (cyclePosition < 0.5625) {
    return { phase: 'Full Moon', emoji: '🌕' }
  } else if (cyclePosition < 0.6875) {
    return { phase: 'Waning Gibbous', emoji: '🌖' }
  } else if (cyclePosition < 0.8125) {
    return { phase: 'Last Quarter', emoji: '🌗' }
  } else if (cyclePosition < 0.9375) {
    return { phase: 'Waning Crescent', emoji: '🌘' }
  } else {
    return { phase: 'New Moon', emoji: '🌑' }
  }
}

function getFishingConditions(phase: MoonPhase): { fishingRating: MoonPhaseData['fishingRating']; fishingTip: string } {
  switch (phase) {
    case 'New Moon':
      return {
        fishingRating: 'excellent',
        fishingTip: 'New moon = peak feeding activity. Fish are more active in low light.',
      }
    case 'Full Moon':
      return {
        fishingRating: 'excellent',
        fishingTip: 'Full moon = strong tidal movement. Great for night fishing.',
      }
    case 'First Quarter':
    case 'Last Quarter':
      return {
        fishingRating: 'good',
        fishingTip: 'Quarter moons bring moderate tidal changes. Good overall conditions.',
      }
    case 'Waxing Crescent':
    case 'Waning Crescent':
      return {
        fishingRating: 'fair',
        fishingTip: 'Crescent phases have less tidal influence. Focus on dawn/dusk.',
      }
    case 'Waxing Gibbous':
    case 'Waning Gibbous':
      return {
        fishingRating: 'good',
        fishingTip: 'Gibbous phases offer good light for night fishing.',
      }
    default:
      return {
        fishingRating: 'fair',
        fishingTip: 'Check local conditions for best results.',
      }
  }
}

/**
 * Get a short label for the moon phase
 */
export function getMoonPhaseShort(date: Date = new Date()): string {
  const { phase, emoji } = getMoonPhase(date)
  return `${emoji} ${phase}`
}
