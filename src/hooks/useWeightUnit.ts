import { useEffect, useState, useCallback } from 'react'
import { DEFAULT_WEIGHT_UNIT, type WeightUnit } from '../utils/weight'

const STORAGE_KEY = 'weight_unit_preference'

export function useWeightUnit() {
  const [unit, setUnit] = useState<WeightUnit>(DEFAULT_WEIGHT_UNIT)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'metric' || stored === 'imperial') {
      setUnit(stored)
    }
  }, [])

  const updateUnit = useCallback((next: WeightUnit) => {
    setUnit(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }, [])

  return { unit, setUnit: updateUnit }
}
