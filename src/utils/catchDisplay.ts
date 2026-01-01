/**
 * Utility functions for displaying catch information with quantity support
 */

/**
 * Format a catch species name with quantity prefix if applicable
 * @param species - The species name
 * @param quantity - The quantity of fish caught (optional)
 * @returns Formatted string like "5x Mackerel" or just "Bass (Sea)"
 */
export function formatCatchSpecies(species: string, quantity?: number | null): string {
  if (quantity && quantity > 1) {
    return `${quantity}x ${species}`
  }
  return species
}

/**
 * Check if a species is quantity-enabled (supports bulk catches)
 * @param species - The species name
 * @returns True if the species supports quantity logging
 */
export function isQuantityEnabledSpecies(species: string): boolean {
  const QUANTITY_ENABLED = ['Schoolie Bass (Undersized)', 'Mackerel']
  return QUANTITY_ENABLED.includes(species)
}
