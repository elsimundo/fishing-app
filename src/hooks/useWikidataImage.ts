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
// Keys should be lowercase and handle both "Bass (Sea)" -> "bass sea" format
const SCIENTIFIC_NAMES: Record<string, string> = {
  // Saltwater - with parenthetical format
  'bass sea': 'Dicentrarchus labrax',
  'bass (sea)': 'Dicentrarchus labrax',
  'sea bass': 'Dicentrarchus labrax',
  'european sea bass': 'Dicentrarchus labrax',
  'cod': 'Gadus morhua',
  'atlantic cod': 'Gadus morhua',
  'mackerel': 'Scomber scombrus',
  'atlantic mackerel': 'Scomber scombrus',
  'pollack': 'Pollachius pollachius',
  'pollock': 'Pollachius pollachius',
  'coalfish': 'Pollachius virens',
  'wrasse ballan': 'Labrus bergylta',
  'wrasse (ballan)': 'Labrus bergylta',
  'ballan wrasse': 'Labrus bergylta',
  'wrasse corkwing': 'Symphodus melops',
  'wrasse (corkwing)': 'Symphodus melops',
  'plaice': 'Pleuronectes platessa',
  'flounder': 'Platichthys flesus',
  'sole': 'Solea solea',
  'dover sole': 'Solea solea',
  'dab': 'Limanda limanda',
  'turbot': 'Scophthalmus maximus',
  'brill': 'Scophthalmus rhombus',
  'dogfish lesser spotted': 'Scyliorhinus canicula',
  'dogfish (lesser spotted)': 'Scyliorhinus canicula',
  'lesser spotted dogfish': 'Scyliorhinus canicula',
  'dogfish greater spotted': 'Scyliorhinus stellaris',
  'dogfish (greater spotted)': 'Scyliorhinus stellaris',
  'bull huss': 'Scyliorhinus stellaris',
  'smoothhound': 'Mustelus mustelus',
  'smooth hound': 'Mustelus mustelus',
  'tope': 'Galeorhinus galeus',
  'rays thornback': 'Raja clavata',
  'rays (thornback)': 'Raja clavata',
  'thornback ray': 'Raja clavata',
  'rays blonde': 'Raja brachyura',
  'rays (blonde)': 'Raja brachyura',
  'rays small-eyed': 'Raja microocellata',
  'rays (small-eyed)': 'Raja microocellata',
  'conger eel': 'Conger conger',
  'conger': 'Conger conger',
  'mullet thick-lipped': 'Chelon labrosus',
  'mullet (thick-lipped)': 'Chelon labrosus',
  'mullet thin-lipped': 'Chelon ramada',
  'mullet (thin-lipped)': 'Chelon ramada',
  'garfish': 'Belone belone',
  'scad horse mackerel': 'Trachurus trachurus',
  'scad (horse mackerel)': 'Trachurus trachurus',
  'black bream': 'Spondyliosoma cantharus',
  'red bream': 'Pagellus bogaraveo',
  'gurnard red': 'Chelidonichthys cuculus',
  'gurnard (red)': 'Chelidonichthys cuculus',
  'red gurnard': 'Chelidonichthys cuculus',
  'gurnard grey': 'Eutrigla gurnardus',
  'gurnard (grey)': 'Eutrigla gurnardus',
  'whiting': 'Merlangius merlangus',
  'pouting': 'Trisopterus luscus',
  'rockling': 'Ciliata mustela',
  'ling': 'Molva molva',
  'haddock': 'Melanogrammus aeglefinus',
  'hake': 'Merluccius merluccius',
  'trigger fish': 'Balistes capriscus',
  'john dory': 'Zeus faber',
  'sea trout': 'Salmo trutta',
  
  // Coarse/Freshwater
  'carp common': 'Cyprinus carpio',
  'carp (common)': 'Cyprinus carpio',
  'common carp': 'Cyprinus carpio',
  'carp mirror': 'Cyprinus carpio',
  'carp (mirror)': 'Cyprinus carpio',
  'carp leather': 'Cyprinus carpio',
  'carp (leather)': 'Cyprinus carpio',
  'pike': 'Esox lucius',
  'northern pike': 'Esox lucius',
  'zander': 'Sander lucioperca',
  'perch': 'Perca fluviatilis',
  'european perch': 'Perca fluviatilis',
  'roach': 'Rutilus rutilus',
  'rudd': 'Scardinius erythrophthalmus',
  'bream common': 'Abramis brama',
  'bream (common)': 'Abramis brama',
  'common bream': 'Abramis brama',
  'tench': 'Tinca tinca',
  'barbel': 'Barbus barbus',
  'chub': 'Squalius cephalus',
  'dace': 'Leuciscus leuciscus',
  'eel': 'Anguilla anguilla',
  
  // Game
  'trout brown': 'Salmo trutta',
  'trout (brown)': 'Salmo trutta',
  'brown trout': 'Salmo trutta',
  'trout rainbow': 'Oncorhynchus mykiss',
  'trout (rainbow)': 'Oncorhynchus mykiss',
  'rainbow trout': 'Oncorhynchus mykiss',
  'salmon atlantic': 'Salmo salar',
  'salmon (atlantic)': 'Salmo salar',
  'atlantic salmon': 'Salmo salar',
  'grayling': 'Thymallus thymallus',
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
    const searchResponse = await fetch(url)
    
    if (!searchResponse.ok) return null

    const searchData = await searchResponse.json()
    if (!searchData.search || searchData.search.length === 0) return null

    // Try to find a fish-related entity
    for (const result of searchData.search) {
      const desc = (result.description || '').toLowerCase()
      if (desc.includes('fish') || desc.includes('species') || desc.includes('shark') || desc.includes('ray')) {
        return { id: result.id }
      }
    }
    
    // Fall back to first result
    return { id: searchData.search[0].id }
  } catch {
    return null
  }
}

async function fetchWikidataImage(speciesName: string): Promise<WikidataImageResult> {
  
  // Normalize the species name for lookup
  const lowerName = speciesName.toLowerCase()
  
  // Try multiple formats for lookup:
  // 1. Exact lowercase: "bass (sea)"
  // 2. Without parentheses: "bass sea"  
  // 3. Reversed parenthetical: "sea bass"
  let scientificName = SCIENTIFIC_NAMES[lowerName]
  
  if (!scientificName) {
    // Try without parentheses: "Bass (Sea)" -> "bass sea"
    const withoutParens = lowerName.replace(/[()]/g, '').replace(/\s+/g, ' ').trim()
    scientificName = SCIENTIFIC_NAMES[withoutParens]
  }
  
  if (!scientificName) {
    // Try extracting and reversing: "Bass (Sea)" -> "sea bass"
    const match = lowerName.match(/^(.+?)\s*\((.+?)\)$/)
    if (match) {
      const reversed = `${match[2]} ${match[1]}`.trim()
      scientificName = SCIENTIFIC_NAMES[reversed]
    }
  }
  
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
