export type FishIdentificationErrorType =
  | 'missing_api_key'
  | 'network'
  | 'rate_limit'
  | 'parse'
  | 'invalid_image'
  | 'no_fish'
  | 'unknown'

export interface FishIdentificationResult {
  species: string
  scientificName: string
  confidence: number
  keyFeatures: string[]
  alternatives: string[]
}

export interface FishIdentificationError {
  type: FishIdentificationErrorType
  message: string
}
