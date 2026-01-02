// Seasonal challenges utility functions

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface SeasonTheme {
  name: string
  icon: string
  color: string
  bgColor: string
  textColor: string
  description: string
}

// Get current season based on month (Northern Hemisphere)
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() // 0-11
  
  if (month >= 2 && month <= 4) return 'spring'   // Mar-May
  if (month >= 5 && month <= 7) return 'summer'   // Jun-Aug
  if (month >= 8 && month <= 10) return 'autumn'  // Sep-Nov
  return 'winter' // Dec-Feb
}

// Get season date range
export function getSeasonDates(season: Season): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  // Winter spans year boundary (Dec-Feb), so we need special handling
  if (season === 'winter') {
    // If we're in Jan or Feb, winter started last year
    if (month <= 1) {
      return {
        start: new Date(year - 1, 11, 1),  // Dec 1 of last year
        end: new Date(year, 1, 28)         // Feb 28 of current year
      }
    }
    // If we're in Dec, winter ends next year
    else if (month === 11) {
      return {
        start: new Date(year, 11, 1),      // Dec 1 of current year
        end: new Date(year + 1, 1, 28)     // Feb 28 of next year
      }
    }
    // If we're in Mar-Nov, next winter starts in Dec
    else {
      return {
        start: new Date(year, 11, 1),      // Dec 1 of current year
        end: new Date(year + 1, 1, 28)     // Feb 28 of next year
      }
    }
  }
  
  const dates = {
    spring: { start: new Date(year, 2, 1), end: new Date(year, 4, 31) },    // Mar 1 - May 31
    summer: { start: new Date(year, 5, 1), end: new Date(year, 7, 31) },    // Jun 1 - Aug 31
    autumn: { start: new Date(year, 8, 1), end: new Date(year, 10, 30) },   // Sep 1 - Nov 30
    winter: { start: new Date(year, 11, 1), end: new Date(year + 1, 1, 28) }, // Fallback (shouldn't reach here)
  }
  
  return dates[season]
}

// Get season theme (colors, icons, etc)
export function getSeasonTheme(season: Season | 'special'): SeasonTheme {
  const themes: Record<Season | 'special', SeasonTheme> = {
    spring: {
      name: 'Spring Awakening',
      icon: '🌸',
      color: 'emerald',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      description: 'New beginnings and spawning season',
    },
    summer: {
      name: 'Summer Slam',
      icon: '☀️',
      color: 'amber',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-600 dark:text-amber-400',
      description: 'Peak season for big catches',
    },
    autumn: {
      name: 'Autumn Trophy Season',
      icon: '🍂',
      color: 'orange',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-600 dark:text-orange-400',
      description: 'Trophy hunting and pre-winter feeding',
    },
    winter: {
      name: 'Winter Warrior',
      icon: '❄️',
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      description: 'Hardcore dedication in cold conditions',
    },
    special: {
      name: 'Special Event',
      icon: '⭐',
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      description: 'Limited-time special challenges',
    },
  }
  
  return themes[season]
}

// Check if a challenge is currently active based on dates
export function isChallengeActive(challenge: { starts_at: string | null; ends_at: string | null }): boolean {
  const now = new Date()
  
  if (!challenge.starts_at && !challenge.ends_at) return true // Permanent challenge
  
  if (challenge.starts_at && new Date(challenge.starts_at) > now) return false // Not started yet
  if (challenge.ends_at && new Date(challenge.ends_at) < now) return false // Already ended
  
  return true
}

// Get days remaining until challenge ends
export function getDaysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null
  
  const now = new Date()
  const end = new Date(endsAt)
  const diffTime = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays > 0 ? diffDays : 0
}

// Format countdown text
export function formatCountdown(endsAt: string | null): string | null {
  const days = getDaysRemaining(endsAt)
  if (days === null) return null
  
  if (days === 0) return 'Ends today!'
  if (days === 1) return '1 day left'
  if (days <= 7) return `${days} days left`
  if (days <= 30) return `${Math.ceil(days / 7)} weeks left`
  
  // For longer periods, calculate months more accurately
  const months = Math.floor(days / 30)
  const remainingDays = days % 30
  
  if (months === 1 && remainingDays < 7) return '1 month left'
  if (months === 1) return `${months} month, ${Math.ceil(remainingDays / 7)} weeks left`
  if (months > 1 && remainingDays < 7) return `${months} months left`
  return `${months} months, ${Math.ceil(remainingDays / 7)} weeks left`
}

// Get season progress percentage
export function getSeasonProgress(season: Season): number {
  const { start, end } = getSeasonDates(season)
  const now = new Date()
  
  if (now < start) return 0
  if (now > end) return 100
  
  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  
  return Math.round((elapsed / total) * 100)
}

// Check if it's the last week of a season
export function isLastWeekOfSeason(season: Season): boolean {
  const { end } = getSeasonDates(season)
  const now = new Date()
  const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  return daysUntilEnd <= 7 && daysUntilEnd > 0
}
