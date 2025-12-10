import { LEGAL_SIZE_RULES, type RegionCode, type LegalSizeRule } from '../types/species'

export type LegalStatus = 'legal' | 'undersized' | 'no_rule'

export function getLegalSizeStatus(params: {
  speciesId: string | null | undefined
  region: RegionCode
  lengthCm: number | null | undefined
}): { status: LegalStatus; rule?: LegalSizeRule } {
  const { speciesId, region, lengthCm } = params

  if (!speciesId || lengthCm == null) {
    return { status: 'no_rule' }
  }

  const rule = LEGAL_SIZE_RULES.find(
    (r) => r.speciesId === speciesId && r.region === region,
  )

  if (!rule || !rule.minLengthCm) {
    return { status: 'no_rule', rule }
  }

  if (lengthCm < rule.minLengthCm) {
    return { status: 'undersized', rule }
  }

  return { status: 'legal', rule }
}
