/**
 * Logbook Page Logic Tests
 */
import { describe, it, expect } from 'vitest'
import { formatWeight } from '../utils/weight'

// Types
interface Catch { id: string; species: string; weight_kg: number | null; length_cm: number | null }
interface SessionStats { total_catches: number; total_weight_kg: number; biggest_catch: Catch | null; species_breakdown: Record<string, number> }
interface Session { id: string; catches: Catch[]; stats: SessionStats }
interface UserChallenge { id: string; challenge_id: string; progress: number; target: number; completed_at: string | null }

// Helper functions
function calculateTotalWeight(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + s.stats.total_weight_kg, 0)
}

function findPersonalBest(sessions: Session[]): Catch | null {
  const allCatches = sessions.flatMap(s => s.catches)
  return allCatches.reduce<Catch | null>((best, c) => {
    if (c.weight_kg == null) return best
    if (!best || (best.weight_kg ?? 0) < c.weight_kg) return c
    return best
  }, null)
}

function formatPersonalBest(catch_: Catch | null): string {
  if (!catch_ || catch_.weight_kg == null) return '—'
  const lengthPart = catch_.length_cm != null ? ` · ${catch_.length_cm.toFixed(0)} cm` : ''
  return `${formatWeight(catch_.weight_kg, { precision: 1 })} · ${catch_.species}${lengthPart}`
}

function calculateTopSpecies(sessions: Session[]): { name: string; count: number } | null {
  const speciesCounts: Record<string, number> = {}
  for (const session of sessions) {
    for (const [species, count] of Object.entries(session.stats.species_breakdown)) {
      speciesCounts[species] = (speciesCounts[species] ?? 0) + count
    }
  }
  const sorted = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])
  return sorted.length === 0 ? null : { name: sorted[0][0], count: sorted[0][1] }
}

function countCompletedChallenges(challenges: UserChallenge[]): number {
  return challenges.filter(c => c.completed_at !== null).length
}

function calculateChallengeProgress(challenge: UserChallenge | undefined): number {
  if (!challenge) return 0
  return Math.min(100, Math.round((challenge.progress / (challenge.target || 1)) * 100))
}

function getPreferenceLabel(preference: string): string {
  const labels: Record<string, string> = { sea: 'Sea Fishing', freshwater: 'Freshwater Fishing', both: 'All Fishing' }
  return labels[preference] ?? 'Unknown'
}

function isValidTab(tab: string): boolean {
  return ['posts', 'sessions', 'catches', 'species', 'achievements'].includes(tab)
}

// Sample data
const sampleSessions: Session[] = [
  { id: '1', catches: [{ id: 'c1', species: 'Bass', weight_kg: 2.5, length_cm: 35 }, { id: 'c2', species: 'Mackerel', weight_kg: 0.5, length_cm: 25 }],
    stats: { total_catches: 2, total_weight_kg: 3.0, biggest_catch: { id: 'c1', species: 'Bass', weight_kg: 2.5, length_cm: 35 }, species_breakdown: { 'Bass': 1, 'Mackerel': 1 } } },
  { id: '2', catches: [{ id: 'c3', species: 'Cod', weight_kg: 5.0, length_cm: 50 }, { id: 'c4', species: 'Mackerel', weight_kg: 0.6, length_cm: 26 }, { id: 'c5', species: 'Mackerel', weight_kg: 0.4, length_cm: 24 }],
    stats: { total_catches: 3, total_weight_kg: 6.0, biggest_catch: { id: 'c3', species: 'Cod', weight_kg: 5.0, length_cm: 50 }, species_breakdown: { 'Cod': 1, 'Mackerel': 2 } } }
]

const sampleChallenges: UserChallenge[] = [
  { id: '1', challenge_id: 'a', progress: 5, target: 10, completed_at: null },
  { id: '2', challenge_id: 'b', progress: 10, target: 10, completed_at: '2025-01-01' },
  { id: '3', challenge_id: 'c', progress: 3, target: 5, completed_at: '2025-01-02' }
]

describe('Total Weight', () => {
  it('sums all sessions', () => expect(calculateTotalWeight(sampleSessions)).toBe(9))
  it('empty sessions = 0', () => expect(calculateTotalWeight([])).toBe(0))
  it('single session', () => expect(calculateTotalWeight([sampleSessions[0]])).toBe(3))
})

describe('Personal Best', () => {
  it('finds heaviest catch', () => {
    const best = findPersonalBest(sampleSessions)
    expect(best?.species).toBe('Cod')
    expect(best?.weight_kg).toBe(5)
  })
  it('empty sessions returns null', () => expect(findPersonalBest([])).toBeNull())
  it('formats with length', () => {
    expect(formatPersonalBest({ id: '1', species: 'Bass', weight_kg: 2.5, length_cm: 35 })).toBe('5 lb 8.2 oz · Bass · 35 cm')
  })
  it('formats without length', () => {
    expect(formatPersonalBest({ id: '1', species: 'Bass', weight_kg: 2.5, length_cm: null })).toBe('5 lb 8.2 oz · Bass')
  })
  it('null returns dash', () => expect(formatPersonalBest(null)).toBe('—'))
})

describe('Top Species', () => {
  it('finds most caught species', () => {
    const top = calculateTopSpecies(sampleSessions)
    expect(top?.name).toBe('Mackerel')
    expect(top?.count).toBe(3)
  })
  it('empty sessions returns null', () => expect(calculateTopSpecies([])).toBeNull())
})

describe('Challenges', () => {
  it('counts completed', () => expect(countCompletedChallenges(sampleChallenges)).toBe(2))
  it('empty = 0 completed', () => expect(countCompletedChallenges([])).toBe(0))
  it('progress 50%', () => expect(calculateChallengeProgress(sampleChallenges[0])).toBe(50))
  it('progress 100% capped', () => expect(calculateChallengeProgress(sampleChallenges[1])).toBe(100))
  it('undefined = 0%', () => expect(calculateChallengeProgress(undefined)).toBe(0))
})

describe('Preference Labels', () => {
  it('sea', () => expect(getPreferenceLabel('sea')).toBe('Sea Fishing'))
  it('freshwater', () => expect(getPreferenceLabel('freshwater')).toBe('Freshwater Fishing'))
  it('both', () => expect(getPreferenceLabel('both')).toBe('All Fishing'))
  it('unknown', () => expect(getPreferenceLabel('other')).toBe('Unknown'))
})

describe('Tab Validation', () => {
  it('posts valid', () => expect(isValidTab('posts')).toBe(true))
  it('sessions valid', () => expect(isValidTab('sessions')).toBe(true))
  it('invalid rejected', () => expect(isValidTab('invalid')).toBe(false))
})
