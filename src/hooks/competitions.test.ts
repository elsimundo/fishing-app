/**
 * Competition Logic Tests
 */
import { describe, it, expect } from 'vitest'

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

// Scoring unit helper
function getScoringUnit(type: CompetitionType): string {
  switch (type) {
    case 'heaviest_fish': return 'lb + oz'
    case 'most_catches': return 'fish'
    case 'species_diversity': return 'species'
    case 'photo_contest': return 'votes'
    default: return ''
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
    case 'heaviest_fish': return entry.biggest_catch_weight
    case 'most_catches': return entry.catch_count
    case 'species_diversity': return entry.species_count
    case 'photo_contest': return 0
    default: return 0
  }
}

// Sort leaderboard by competition type
function sortLeaderboard(entries: LeaderboardEntry[], type: CompetitionType): LeaderboardEntry[] {
  return [...entries].sort((a, b) => calculateScore(b, type) - calculateScore(a, type))
}

// Get placement suffix
function getPlacementSuffix(position: number): string {
  if (position === 1) return '1st'
  if (position === 2) return '2nd'
  if (position === 3) return '3rd'
  return `${position}th`
}

// Check if competition is joinable
function isJoinable(competition: Competition): boolean {
  return competition.status !== 'cancelled' && competition.status !== 'completed'
}

describe('Competition Scoring Units', () => {
  it('Heaviest fish uses lb + oz', () => {
    expect(getScoringUnit('heaviest_fish')).toBe('lb + oz')
  })

  it('Most catches uses fish', () => {
    expect(getScoringUnit('most_catches')).toBe('fish')
  })

  it('Species diversity uses species', () => {
    expect(getScoringUnit('species_diversity')).toBe('species')
  })

  it('Photo contest uses votes', () => {
    expect(getScoringUnit('photo_contest')).toBe('votes')
  })
})

describe('Competition Status', () => {
  it('Future competition is upcoming', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(getCompetitionStatus(tomorrow, nextWeek)).toBe('upcoming')
  })

  it('Current competition is active', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    expect(getCompetitionStatus(yesterday, tomorrow)).toBe('active')
  })

  it('Past competition is completed', () => {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(getCompetitionStatus(lastWeek, yesterday)).toBe('completed')
  })
})

describe('Score Calculation', () => {
  const testEntry: LeaderboardEntry = {
    user_id: '1',
    username: 'angler1',
    total_weight: 15.5,
    catch_count: 8,
    species_count: 4,
    biggest_catch_weight: 5.2
  }

  it('Heaviest fish scores by biggest catch', () => {
    expect(calculateScore(testEntry, 'heaviest_fish')).toBe(5.2)
  })

  it('Most catches scores by catch count', () => {
    expect(calculateScore(testEntry, 'most_catches')).toBe(8)
  })

  it('Species diversity scores by species count', () => {
    expect(calculateScore(testEntry, 'species_diversity')).toBe(4)
  })
})

describe('Leaderboard Sorting', () => {
  const entries: LeaderboardEntry[] = [
    { user_id: '1', username: 'alice', total_weight: 10, catch_count: 5, species_count: 3, biggest_catch_weight: 4 },
    { user_id: '2', username: 'bob', total_weight: 8, catch_count: 10, species_count: 2, biggest_catch_weight: 2 },
    { user_id: '3', username: 'charlie', total_weight: 12, catch_count: 3, species_count: 5, biggest_catch_weight: 6 },
  ]

  it('Heaviest fish sorts by biggest catch weight', () => {
    const sorted = sortLeaderboard(entries, 'heaviest_fish')
    expect(sorted[0].username).toBe('charlie')
    expect(sorted[1].username).toBe('alice')
    expect(sorted[2].username).toBe('bob')
  })

  it('Most catches sorts by catch count', () => {
    const sorted = sortLeaderboard(entries, 'most_catches')
    expect(sorted[0].username).toBe('bob')
    expect(sorted[1].username).toBe('alice')
    expect(sorted[2].username).toBe('charlie')
  })

  it('Empty leaderboard sorts without error', () => {
    const sorted = sortLeaderboard([], 'heaviest_fish')
    expect(sorted.length).toBe(0)
  })
})

describe('Placement Suffix', () => {
  it('1st place', () => expect(getPlacementSuffix(1)).toBe('1st'))
  it('2nd place', () => expect(getPlacementSuffix(2)).toBe('2nd'))
  it('3rd place', () => expect(getPlacementSuffix(3)).toBe('3rd'))
  it('4th place', () => expect(getPlacementSuffix(4)).toBe('4th'))
  it('11th place', () => expect(getPlacementSuffix(11)).toBe('11th'))
})

describe('Competition Joinability', () => {
  it('Upcoming competition is joinable', () => {
    const comp: Competition = { id: '1', title: 'Test', type: 'heaviest_fish', status: 'upcoming', starts_at: '', ends_at: '', is_public: true }
    expect(isJoinable(comp)).toBe(true)
  })

  it('Active competition is joinable', () => {
    const comp: Competition = { id: '1', title: 'Test', type: 'heaviest_fish', status: 'active', starts_at: '', ends_at: '', is_public: true }
    expect(isJoinable(comp)).toBe(true)
  })

  it('Completed competition is not joinable', () => {
    const comp: Competition = { id: '1', title: 'Test', type: 'heaviest_fish', status: 'completed', starts_at: '', ends_at: '', is_public: true }
    expect(isJoinable(comp)).toBe(false)
  })

  it('Cancelled competition is not joinable', () => {
    const comp: Competition = { id: '1', title: 'Test', type: 'heaviest_fish', status: 'cancelled', starts_at: '', ends_at: '', is_public: true }
    expect(isJoinable(comp)).toBe(false)
  })
})
