/**
 * Session Stats & Logic Tests
 */
import { describe, it, expect } from 'vitest'

// Types
interface Session { id: string; started_at: string; ended_at: string | null }
interface Catch { id: string; species: string; weight_kg: number | null }
interface SessionStats { total_catches: number; total_weight_kg: number; biggest_catch: Catch | null; species_breakdown: Record<string, number>; duration_hours: number }

function getDurationHours(session: Session): number {
  const start = new Date(session.started_at).getTime()
  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  return +(( end - start) / (1000 * 60 * 60)).toFixed(2)
}

function calculateSessionStats(session: Session, catches: Catch[]): SessionStats {
  let total_weight_kg = 0
  let biggest_catch: Catch | null = null
  const species_breakdown: Record<string, number> = {}

  for (const c of catches) {
    if (c.weight_kg != null) {
      total_weight_kg += c.weight_kg
      if (!biggest_catch || (biggest_catch.weight_kg ?? 0) < c.weight_kg) biggest_catch = c
    }
    if (c.species) species_breakdown[c.species] = (species_breakdown[c.species] ?? 0) + 1
  }

  return { total_catches: catches.length, total_weight_kg: +total_weight_kg.toFixed(2), biggest_catch, species_breakdown, duration_hours: getDurationHours(session) }
}

function getLocationPrivacyLabel(privacy: 'exact' | 'approximate' | 'hidden'): string {
  const labels = { exact: 'Exact location visible', approximate: 'Approximate area shown', hidden: 'Location hidden' }
  return labels[privacy] ?? 'Unknown'
}

function getSessionStatus(session: Session): 'active' | 'completed' {
  return session.ended_at ? 'completed' : 'active'
}

describe('Duration Calculation', () => {
  it('1 hour session', () => {
    expect(getDurationHours({ id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T11:00:00Z' })).toBe(1)
  })
  it('2.5 hour session', () => {
    expect(getDurationHours({ id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:30:00Z' })).toBe(2.5)
  })
  it('30 minute session', () => {
    expect(getDurationHours({ id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T10:30:00Z' })).toBe(0.5)
  })
  it('invalid dates return 0', () => {
    expect(getDurationHours({ id: '1', started_at: 'invalid', ended_at: '2025-01-01T11:00:00Z' })).toBe(0)
  })
  it('end before start returns 0', () => {
    expect(getDurationHours({ id: '1', started_at: '2025-01-01T12:00:00Z', ended_at: '2025-01-01T10:00:00Z' })).toBe(0)
  })
  it('24 hour session', () => {
    expect(getDurationHours({ id: '1', started_at: '2025-01-01T00:00:00Z', ended_at: '2025-01-02T00:00:00Z' })).toBe(24)
  })
})

describe('Stats Calculation', () => {
  const session: Session = { id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' }

  it('empty catches = 0 stats', () => {
    const stats = calculateSessionStats({ id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T11:00:00Z' }, [])
    expect(stats.total_catches).toBe(0)
    expect(stats.total_weight_kg).toBe(0)
    expect(stats.biggest_catch).toBeNull()
  })

  it('single catch with weight', () => {
    const stats = calculateSessionStats(session, [{ id: 'c1', species: 'Bass', weight_kg: 2.5 }])
    expect(stats.total_catches).toBe(1)
    expect(stats.total_weight_kg).toBe(2.5)
    expect(stats.biggest_catch?.species).toBe('Bass')
  })

  it('multiple catches total weight', () => {
    const catches = [{ id: 'c1', species: 'Bass', weight_kg: 2.5 }, { id: 'c2', species: 'Cod', weight_kg: 3.0 }, { id: 'c3', species: 'Mackerel', weight_kg: 0.5 }]
    const stats = calculateSessionStats(session, catches)
    expect(stats.total_catches).toBe(3)
    expect(stats.total_weight_kg).toBe(6)
  })

  it('biggest catch identified', () => {
    const catches = [{ id: 'c1', species: 'Bass', weight_kg: 2.5 }, { id: 'c2', species: 'Cod', weight_kg: 5.0 }]
    const stats = calculateSessionStats(session, catches)
    expect(stats.biggest_catch?.id).toBe('c2')
  })

  it('species breakdown', () => {
    const catches = [{ id: 'c1', species: 'Bass', weight_kg: 2.5 }, { id: 'c2', species: 'Mackerel', weight_kg: 0.5 }, { id: 'c3', species: 'Mackerel', weight_kg: 0.6 }]
    const stats = calculateSessionStats(session, catches)
    expect(stats.species_breakdown['Bass']).toBe(1)
    expect(stats.species_breakdown['Mackerel']).toBe(2)
  })

  it('catches without weight still count', () => {
    const catches = [{ id: 'c1', species: 'Bass', weight_kg: null }, { id: 'c2', species: 'Cod', weight_kg: 3.0 }]
    const stats = calculateSessionStats(session, catches)
    expect(stats.total_catches).toBe(2)
    expect(stats.total_weight_kg).toBe(3)
  })
})

describe('Privacy Labels', () => {
  it('exact', () => expect(getLocationPrivacyLabel('exact')).toBe('Exact location visible'))
  it('approximate', () => expect(getLocationPrivacyLabel('approximate')).toBe('Approximate area shown'))
  it('hidden', () => expect(getLocationPrivacyLabel('hidden')).toBe('Location hidden'))
})

describe('Session Status', () => {
  it('with ended_at is completed', () => {
    expect(getSessionStatus({ id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: '2025-01-01T12:00:00Z' })).toBe('completed')
  })
  it('without ended_at is active', () => {
    expect(getSessionStatus({ id: '1', started_at: '2025-01-01T10:00:00Z', ended_at: null })).toBe('active')
  })
})
