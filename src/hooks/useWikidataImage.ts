import { useQuery } from '@tanstack/react-query'

interface WikidataImageResult {
  imageUrl: string | null
  thumbnailUrl: string | null
  attribution: string | null
}

// Convert Wikimedia Commons filename to actual image URL
function getCommonsImageUrl(filename: string, width: number = 400): { full: string; thumb: string } {
  // Remove "File:" prefix if present
  const cleanFilename = filename.replace(/^File:/, '')
  
  // Wikimedia Commons uses MD5 hash for directory structure
  const encoded = encodeURIComponent(cleanFilename.replace(/ /g, '_'))
  
  // For thumbnails, use the thumb endpoint
  const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${width}`
  const fullUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}`
  
  return { full: fullUrl, thumb: thumbUrl }
}

// Common name to scientific name mapping for better Wikidata search
const SCIENTIFIC_NAMES: Record<string, string> = {
  'smoothhound': 'Mustelus mustelus',
  'smooth hound': 'Mustelus mustelus',
  'tope': 'Galeorhinus galeus',
  'bass': 'Dicentrarchus labrax',
  'sea bass': 'Dicentrarchus labrax',
  'european sea bass': 'Dicentrarchus labrax',
  'cod': 'Gadus morhua',
  'atlantic cod': 'Gadus morhua',
  'mackerel': 'Scomber scombrus',
  'atlantic mackerel': 'Scomber scombrus',
  'pollack': 'Pollachius pollachius',
  'pollock': 'Pollachius pollachius',
  'carp': 'Cyprinus carpio',
  'common carp': 'Cyprinus carpio',
  'pike': 'Esox lucius',
  'northern pike': 'Esox lucius',
  'perch': 'Perca fluviatilis',
  'european perch': 'Perca fluviatilis',
  'roach': 'Rutilus rutilus',
  'bream': 'Abramis brama',
  'common bream': 'Abramis brama',
  'tench': 'Tinca tinca',
  'trout': 'Salmo trutta',
  'brown trout': 'Salmo trutta',
  'rainbow trout': 'Oncorhynchus mykiss',
  'salmon': 'Salmo salar',
  'atlantic salmon': 'Salmo salar',
  'plaice': 'Pleuronectes platessa',
  'flounder': 'Platichthys flesus',
  'sole': 'Solea solea',
  'dover sole': 'Solea solea',
  'turbot': 'Scophthalmus maximus',
  'ray': 'Raja clavata',
  'thornback ray': 'Raja clavata',
  'conger': 'Conger conger',
  'conger eel': 'Conger conger',
  'ling': 'Molva molva',
  'wrasse': 'Labrus bergylta',
  'ballan wrasse': 'Labrus bergylta',
  'mullet': 'Chelon labrosus',
  'grey mullet': 'Chelon labrosus',
  'garfish': 'Belone belone',
  'gurnard': 'Chelidonichthys lucerna',
  'red gurnard': 'Chelidonichthys cuculus',
  'dogfish': 'Scyliorhinus canicula',
  'lesser spotted dogfish': 'Scyliorhinus canicula',
  'bull huss': 'Scyliorhinus stellaris',
  'spurdog': 'Squalus acanthias',
  'whiting': 'Merlangius merlangus',
  'pouting': 'Trisopterus luscus',
  'dab': 'Limanda limanda',
}

async function searchWikidata(searchTerm: string): Promise<{ id: string } | null> {
  try {
    const searchParams = new URLSearchParams({
      action: 'wbsearchentities',
      search: searchTerm,
      language: 'en',
      format: 'json',
      origin: '*',
      limit: '5',
    })

    const url = `https://www.wikidata.org/w/api.php?${searchParams.toString()}`
    console.log('Wikidata search URL:', url)
    
    const searchResponse = await fetch(url)
    
    if (!searchResponse.ok) {
      console.log('Wikidata search failed:', searchResponse.status)
      return null
    }

    const searchData = await searchResponse.json()
    console.log('Wikidata search results for', searchTerm, ':', searchData)
    
    if (!searchData.search || searchData.search.length === 0) return null

    // Try to find a fish-related entity
    for (const result of searchData.search) {
      const desc = (result.description || '').toLowerCase()
      if (desc.includes('fish') || desc.includes('species') || desc.includes('shark') || desc.includes('ray')) {
        console.log('Found fish entity:', result.id)
        return { id: result.id }
      }
    }
    
    // Fall back to first result
    console.log('Using first result:', searchData.search[0].id)
    return { id: searchData.search[0].id }
  } catch (error) {
    console.error('Wikidata search error:', error)
    return null
  }
}

async function fetchWikidataImage(speciesName: string): Promise<WikidataImageResult> {
  console.log('fetchWikidataImage called for:', speciesName)
  
  // Try scientific name first if we have a mapping
  const lowerName = speciesName.toLowerCase()
  const scientificName = SCIENTIFIC_NAMES[lowerName]
  console.log('Scientific name mapping:', lowerName, '->', scientificName)
  
  let entity: { id: string } | null = null
  
  // Try scientific name first
  if (scientificName) {
    entity = await searchWikidata(scientificName)
  }
  
  // Fall back to common name search
  if (!entity) {
    entity = await searchWikidata(speciesName)
  }
  
  // Try with "fish" suffix
  if (!entity) {
    entity = await searchWikidata(`${speciesName} fish`)
  }
  
  if (!entity) {
    return { imageUrl: null, thumbnailUrl: null, attribution: null }
  }

  const entityId = entity.id

  // Step 2: Get the entity with image claims
  const entityParams = new URLSearchParams({
    action: 'wbgetentities',
    ids: entityId,
    props: 'claims',
    format: 'json',
    origin: '*',
  })

  const entityResponse = await fetch(
    `https://www.wikidata.org/w/api.php?${entityParams.toString()}`
  )

  if (!entityResponse.ok) {
    throw new Error('Failed to fetch Wikidata entity')
  }

  const entityData = await entityResponse.json()
  const entityDetails = entityData.entities?.[entityId]

  if (!entityDetails?.claims) {
    return { imageUrl: null, thumbnailUrl: null, attribution: null }
  }

  // P18 is the "image" property in Wikidata
  const imageClaim = entityDetails.claims.P18?.[0]
  
  if (!imageClaim?.mainsnak?.datavalue?.value) {
    return { imageUrl: null, thumbnailUrl: null, attribution: null }
  }

  const filename = imageClaim.mainsnak.datavalue.value
  const urls = getCommonsImageUrl(filename, 400)

  return {
    imageUrl: urls.full,
    thumbnailUrl: urls.thumb,
    attribution: 'Image from Wikimedia Commons',
  }
}

export function useWikidataImage(speciesName: string | null | undefined) {
  return useQuery({
    queryKey: ['wikidata-image', speciesName],
    queryFn: () => fetchWikidataImage(speciesName!),
    enabled: !!speciesName,
    staleTime: 7 * 24 * 60 * 60 * 1000, // Cache for 7 days
    retry: 1,
  })
}
