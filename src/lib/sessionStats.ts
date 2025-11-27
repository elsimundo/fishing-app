import type { Catch, Session, SessionStats } from '../types'

function getDurationHours(session: Session): number {
  const start = new Date(session.started_at).getTime()
  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  const diffMs = end - start
  return +(diffMs / (1000 * 60 * 60)).toFixed(2)
}

export function calculateSessionStats(session: Session, catches: Catch[]): SessionStats {
  const total_catches = catches.length

  let total_weight_kg = 0
  let biggest_catch: Catch | null = null
  const species_breakdown: Record<string, number> = {}

  for (const c of catches) {
    if (c.weight_kg != null) {
      total_weight_kg += c.weight_kg
      if (!biggest_catch || (biggest_catch.weight_kg ?? 0) < c.weight_kg) {
        biggest_catch = c
      }
    }

    if (c.species) {
      species_breakdown[c.species] = (species_breakdown[c.species] ?? 0) + 1
    }
  }

  return {
    total_catches,
    total_weight_kg: +total_weight_kg.toFixed(2),
    biggest_catch,
    species_breakdown,
    duration_hours: getDurationHours(session),
  }
}
