/**
 * Reverse geocoding utilities for getting country from coordinates
 */

/**
 * Get country code from coordinates using free reverse geocoding
 * Uses BigDataCloud API (free, no API key required for basic usage)
 */
export async function getCountryFromCoords(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    return data.countryCode || null // Returns ISO 3166-1 alpha-2 (e.g., 'GB', 'PT')
  } catch (error) {
    console.error('[reverseGeocode] Failed:', error)
    return null
  }
}

/**
 * Country code to display name mapping
 */
export const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom',
  PT: 'Portugal',
  ES: 'Spain',
  FR: 'France',
  DE: 'Germany',
  NL: 'Netherlands',
  BE: 'Belgium',
  IE: 'Ireland',
  IT: 'Italy',
  GR: 'Greece',
  HR: 'Croatia',
  PL: 'Poland',
  CZ: 'Czech Republic',
  AT: 'Austria',
  CH: 'Switzerland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  ZA: 'South Africa',
  TH: 'Thailand',
  JP: 'Japan',
  // Add more as needed
}

/**
 * Country code to flag emoji mapping
 */
export const COUNTRY_FLAGS: Record<string, string> = {
  GB: '🇬🇧',
  PT: '🇵🇹',
  ES: '🇪🇸',
  FR: '🇫🇷',
  DE: '🇩🇪',
  NL: '🇳🇱',
  BE: '🇧🇪',
  IE: '🇮🇪',
  IT: '🇮🇹',
  GR: '🇬🇷',
  HR: '🇭🇷',
  PL: '🇵🇱',
  CZ: '🇨🇿',
  AT: '🇦🇹',
  CH: '🇨🇭',
  SE: '🇸🇪',
  NO: '🇳🇴',
  DK: '🇩🇰',
  FI: '🇫🇮',
  US: '🇺🇸',
  CA: '🇨🇦',
  AU: '🇦🇺',
  NZ: '🇳🇿',
  ZA: '🇿🇦',
  TH: '🇹🇭',
  JP: '🇯🇵',
}

/**
 * European country codes for "European Tour" challenge
 */
export const EUROPEAN_COUNTRIES = [
  'GB', 'PT', 'ES', 'FR', 'DE', 'NL', 'BE', 'IE', 'IT', 'GR',
  'HR', 'PL', 'CZ', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'HU',
  'RO', 'BG', 'SK', 'SI', 'LT', 'LV', 'EE', 'CY', 'MT', 'LU',
]

/**
 * Get country name from code, with fallback
 */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code
}

/**
 * Get country flag from code, with fallback
 */
export function getCountryFlag(code: string): string {
  return COUNTRY_FLAGS[code] || '🏳️'
}
