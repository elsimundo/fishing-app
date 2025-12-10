export type RegionCode =
  | 'uk_england'
  | 'uk_wales'
  | 'uk_scotland'
  | 'uk_ni'
  | 'global'

export type WaterType = 'saltwater' | 'freshwater' | 'coarse' | 'game'

export interface Species {
  id: string
  commonName: string
  displayName: string
  scientificName: string
  waterType: WaterType
  supportedRegions: RegionCode[]
}

export interface LegalSizeRule {
  speciesId: string
  region: RegionCode
  minLengthCm?: number
  maxLengthCm?: number
  minWeightKg?: number
  bagLimitPerDay?: number
  closedSeasons?: { from: string; to: string }[]
  notes?: string
}

export const SPECIES: Species[] = [
  // Seed with a few concrete examples; more can be added over time
  {
    id: 'atlantic_mackerel',
    commonName: 'Atlantic mackerel',
    displayName: 'Mackerel',
    scientificName: 'Scomber scombrus',
    waterType: 'saltwater',
    supportedRegions: ['uk_england', 'uk_wales', 'uk_scotland', 'uk_ni', 'global'],
  },
  {
    id: 'european_sea_bass',
    commonName: 'European sea bass',
    displayName: 'Bass (Sea)',
    scientificName: 'Dicentrarchus labrax',
    waterType: 'saltwater',
    supportedRegions: ['uk_england', 'uk_wales', 'uk_scotland', 'uk_ni', 'global'],
  },
  {
    id: 'brown_trout',
    commonName: 'Brown trout',
    displayName: 'Trout (Brown)',
    scientificName: 'Salmo trutta',
    waterType: 'game',
    supportedRegions: ['uk_england', 'uk_wales', 'uk_scotland', 'uk_ni', 'global'],
  },
  {
    id: 'rainbow_trout',
    commonName: 'Rainbow trout',
    displayName: 'Trout (Rainbow)',
    scientificName: 'Oncorhynchus mykiss',
    waterType: 'game',
    supportedRegions: ['uk_england', 'uk_wales', 'uk_scotland', 'uk_ni', 'global'],
  },
  {
    id: 'atlantic_salmon',
    commonName: 'Atlantic salmon',
    displayName: 'Salmon (Atlantic)',
    scientificName: 'Salmo salar',
    waterType: 'game',
    supportedRegions: ['uk_england', 'uk_wales', 'uk_scotland', 'uk_ni', 'global'],
  },
]

export const LEGAL_SIZE_RULES: LegalSizeRule[] = [
  // Placeholder examples - values must be verified against current regulations
  {
    speciesId: 'european_sea_bass',
    region: 'uk_england',
    minLengthCm: 42,
    bagLimitPerDay: 2,
    notes: 'Example only – verify with the latest UK MMO / IFCA guidance.',
  },
]
