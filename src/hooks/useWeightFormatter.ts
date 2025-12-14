import { useMemo } from 'react'
import { formatWeight, type WeightUnit } from '../utils/weight'
import { useWeightUnit } from './useWeightUnit'

type FormatOpts = Parameters<typeof formatWeight>[1]

export function useWeightFormatter() {
  const { unit, setUnit } = useWeightUnit()

  const format = useMemo(
    () =>
      (weightKg: number | null | undefined, options: Omit<FormatOpts, 'unit'> = {}) =>
        formatWeight(weightKg, { ...options, unit }),
    [unit],
  )

  return {
    unit: unit as WeightUnit,
    setUnit,
    formatWeight: format,
  }
}
