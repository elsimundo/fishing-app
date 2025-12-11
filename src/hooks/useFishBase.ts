import { useQuery } from '@tanstack/react-query'

const FISHBASE_API = 'https://fishbase.ropensci.org'

export interface FishBaseSpecies {
  SpecCode: number
  sciname: string
  Genus: string
  Species: string
  FBname: string | null
  Author: string | null
  Fresh: number
  Brack: number
  Saltwater: number
  DemersPelag: string | null
  Length: number | null
  LTypeMaxM: string | null
  CommonLength: number | null
  Weight: number | null
  DepthRangeShallow: number | null
  DepthRangeDeep: number | null
  Vulnerability: number | null
  Dangerous: string | null
  GameFish: number | null
  Comments: string | null
}

export interface FishBaseEcology {
  SpecCode: number
  Herbivory2: string | null
  FeedingType: string | null
  DietTroph: number | null
  FoodTroph: number | null
  AddRems: string | null
}

export interface FishBaseCommonName {
  ComName: string
  Language: string
  SpecCode: number
}

// Search FishBase by common name to get SpecCode
async function searchByCommonName(name: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${FISHBASE_API}/comnames?ComName=${encodeURIComponent(name)}&limit=5`
    )
    if (!response.ok) return null
    
    const data = await response.json()
    if (data.data && data.data.length > 0) {
      // Return the first match's SpecCode
      return data.data[0].SpecCode
    }
    return null
  } catch (e) {
    console.error('FishBase search error:', e)
    return null
  }
}

// Search FishBase by scientific name
async function searchByScientificName(genus: string, species: string): Promise<FishBaseSpecies | null> {
  try {
    const response = await fetch(
      `${FISHBASE_API}/species?genus=${encodeURIComponent(genus)}&species=${encodeURIComponent(species)}&limit=1`
    )
    if (!response.ok) return null
    
    const data = await response.json()
    if (data.data && data.data.length > 0) {
      return data.data[0] as FishBaseSpecies
    }
    return null
  } catch (e) {
    console.error('FishBase search error:', e)
    return null
  }
}

// Get species data by SpecCode
async function getSpeciesByCode(specCode: number): Promise<FishBaseSpecies | null> {
  try {
    const response = await fetch(
      `${FISHBASE_API}/species?SpecCode=${specCode}&limit=1`
    )
    if (!response.ok) return null
    
    const data = await response.json()
    if (data.data && data.data.length > 0) {
      return data.data[0] as FishBaseSpecies
    }
    return null
  } catch (e) {
    console.error('FishBase species fetch error:', e)
    return null
  }
}

// Get ecology data by SpecCode
async function getEcologyByCode(specCode: number): Promise<FishBaseEcology | null> {
  try {
    const response = await fetch(
      `${FISHBASE_API}/ecology?SpecCode=${specCode}&limit=1`
    )
    if (!response.ok) return null
    
    const data = await response.json()
    if (data.data && data.data.length > 0) {
      return data.data[0] as FishBaseEcology
    }
    return null
  } catch (e) {
    console.error('FishBase ecology fetch error:', e)
    return null
  }
}

export interface FishBaseData {
  species: FishBaseSpecies | null
  ecology: FishBaseEcology | null
  commonName: string | null
}

// Main hook to fetch FishBase data by common name
export function useFishBaseData(commonName: string | null | undefined) {
  return useQuery({
    queryKey: ['fishbase', commonName],
    queryFn: async (): Promise<FishBaseData | null> => {
      if (!commonName) return null

      // First, search by common name to get SpecCode
      const specCode = await searchByCommonName(commonName)
      
      if (!specCode) {
        // Try parsing as "Genus species" format
        const parts = commonName.split(' ')
        if (parts.length >= 2) {
          const species = await searchByScientificName(parts[0], parts[1])
          if (species) {
            const ecology = await getEcologyByCode(species.SpecCode)
            return {
              species,
              ecology,
              commonName: species.FBname || commonName,
            }
          }
        }
        return null
      }

      // Fetch species and ecology data in parallel
      const [species, ecology] = await Promise.all([
        getSpeciesByCode(specCode),
        getEcologyByCode(specCode),
      ])

      return {
        species,
        ecology,
        commonName: species?.FBname || commonName,
      }
    },
    enabled: !!commonName,
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    retry: 1,
  })
}

// Helper to format FishBase data into a readable description
export function formatFishBaseDescription(data: FishBaseData): string {
  if (!data.species) return ''

  const parts: string[] = []
  
  // Scientific name
  if (data.species.sciname) {
    parts.push(`Scientific name: ${data.species.sciname}`)
  }

  // Habitat
  const habitats: string[] = []
  if (data.species.Saltwater === 1) habitats.push('marine')
  if (data.species.Fresh === 1) habitats.push('freshwater')
  if (data.species.Brack === 1) habitats.push('brackish')
  if (habitats.length > 0) {
    parts.push(`Found in ${habitats.join(', ')} environments`)
  }

  // Depth range
  if (data.species.DepthRangeShallow != null && data.species.DepthRangeDeep != null) {
    parts.push(`Depth range: ${data.species.DepthRangeShallow}-${data.species.DepthRangeDeep}m`)
  }

  // Behavior
  if (data.species.DemersPelag) {
    const behavior = data.species.DemersPelag.toLowerCase()
    if (behavior.includes('pelagic')) {
      parts.push('Pelagic species (open water)')
    } else if (behavior.includes('demersal')) {
      parts.push('Demersal species (bottom dwelling)')
    } else if (behavior.includes('reef')) {
      parts.push('Reef-associated species')
    }
  }

  // Game fish status
  if (data.species.GameFish === 1) {
    parts.push('Recognized as a game fish')
  }

  return parts.join('. ') + (parts.length > 0 ? '.' : '')
}

// Helper to get max size info
export function getFishBaseMaxSize(data: FishBaseData): { lengthCm: number | null; weightKg: number | null } {
  if (!data.species) return { lengthCm: null, weightKg: null }
  
  return {
    lengthCm: data.species.Length,
    weightKg: data.species.Weight ? data.species.Weight / 1000 : null, // Convert grams to kg
  }
}

// Helper to determine water type
export function getFishBaseWaterType(data: FishBaseData): 'saltwater' | 'freshwater' | 'both' | null {
  if (!data.species) return null
  
  const isSalt = data.species.Saltwater === 1
  const isFresh = data.species.Fresh === 1
  
  if (isSalt && isFresh) return 'both'
  if (isSalt) return 'saltwater'
  if (isFresh) return 'freshwater'
  return null
}
