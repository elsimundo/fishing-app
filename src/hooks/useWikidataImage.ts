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

async function fetchWikidataImage(speciesName: string): Promise<WikidataImageResult> {
  // Step 1: Search for the species entity
  const searchParams = new URLSearchParams({
    action: 'wbsearchentities',
    search: speciesName,
    language: 'en',
    format: 'json',
    origin: '*', // Required for CORS
    limit: '5',
  })

  const searchResponse = await fetch(
    `https://www.wikidata.org/w/api.php?${searchParams.toString()}`
  )
  
  if (!searchResponse.ok) {
    throw new Error('Failed to search Wikidata')
  }

  const searchData = await searchResponse.json()
  
  if (!searchData.search || searchData.search.length === 0) {
    return { imageUrl: null, thumbnailUrl: null, attribution: null }
  }

  // Try to find a fish-related entity (check description for fish/species keywords)
  let entityId = searchData.search[0].id
  for (const result of searchData.search) {
    const desc = (result.description || '').toLowerCase()
    if (desc.includes('fish') || desc.includes('species') || desc.includes('marine') || desc.includes('freshwater')) {
      entityId = result.id
      break
    }
  }

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
  const entity = entityData.entities?.[entityId]

  if (!entity?.claims) {
    return { imageUrl: null, thumbnailUrl: null, attribution: null }
  }

  // P18 is the "image" property in Wikidata
  const imageClaim = entity.claims.P18?.[0]
  
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
