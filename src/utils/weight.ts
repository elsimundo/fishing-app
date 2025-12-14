export type WeightUnit = 'imperial' | 'metric'

export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'imperial'
const KG_PER_LB = 0.45359237
const OZ_PER_LB = 16

export function kgToLbsOz(weightKg: number) {
  const totalOunces = weightKg / KG_PER_LB * OZ_PER_LB
  const pounds = Math.floor(totalOunces / OZ_PER_LB)
  let ounces = Number((totalOunces - pounds * OZ_PER_LB).toFixed(1))

  // Round edge case where ounces rolls over to a full pound
  if (ounces >= OZ_PER_LB) {
    return { pounds: pounds + 1, ounces: 0 }
  }

  return { pounds, ounces }
}

export function lbsOzToKg(pounds: number, ounces: number) {
  const totalLbs = pounds + ounces / OZ_PER_LB
  return totalLbs * KG_PER_LB
}

type FormatOptions = {
  unit?: WeightUnit
  precision?: number
  fallback?: string
}

export function formatWeight(weightKg: number | null | undefined, options: FormatOptions = {}) {
  const { unit = DEFAULT_WEIGHT_UNIT, precision = 1, fallback = '—' } = options
  if (weightKg == null || Number.isNaN(weightKg)) return fallback

  if (unit === 'metric') {
    return `${weightKg.toFixed(precision)} kg`
  }

  const { pounds, ounces } = kgToLbsOz(weightKg)
  const showOunces = ounces > 0
  const ozLabel = showOunces ? `${ounces % 1 === 0 ? ounces.toFixed(0) : ounces.toFixed(1)} oz` : ''
  return showOunces ? `${pounds} lb ${ozLabel}` : `${pounds} lb`
}
