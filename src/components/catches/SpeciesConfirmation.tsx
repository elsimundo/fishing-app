import { useState } from 'react'
import type { FishIdentificationResult } from '../../types/fish'
import { Check, Search } from 'lucide-react'
import { getAllSpecies } from '../../lib/constants'
import { useFreshwaterEnabled } from '../../hooks/useFeatureFlags'

interface SpeciesConfirmationProps {
  result: FishIdentificationResult
  onConfirm: (species: string) => void
  onReject?: () => void // Optional, no longer used but kept for backwards compatibility
}

export function SpeciesConfirmation({ result, onConfirm }: SpeciesConfirmationProps) {
  const { species, scientificName, confidence, alternatives } = result
  const [showManualPicker, setShowManualPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const freshwaterEnabled = useFreshwaterEnabled()

  // Get species list based on freshwater feature flag
  const allSpecies = getAllSpecies(freshwaterEnabled)

  const confidenceColor =
    confidence >= 80 ? 'bg-emerald-900/30 text-emerald-400' : confidence >= 60 ? 'bg-amber-900/30 text-amber-400' : 'bg-red-900/30 text-red-400'

  // Filter species based on search
  const filteredSpecies = searchQuery.trim()
    ? allSpecies.filter((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : allSpecies

  const handleSelectManual = (selectedSpecies: string) => {
    setShowManualPicker(false)
    setSearchQuery('')
    onConfirm(selectedSpecies)
  }

  // Get similar species - prioritize alternatives from AI, then show related species
  const getSimilarSpecies = (): string[] => {
    const similar: string[] = []
    
    // Add AI alternatives first
    if (alternatives && alternatives.length > 0) {
      similar.push(...alternatives)
    }
    
    // Add species with similar names (e.g., other sharks for shark species)
    const speciesLower = species.toLowerCase()
    const keywords = ['shark', 'ray', 'bass', 'bream', 'carp', 'trout', 'cod', 'wrasse', 'mullet', 'dogfish', 'smoothhound', 'tope']
    
    for (const keyword of keywords) {
      if (speciesLower.includes(keyword)) {
        const related = allSpecies.filter((s: string) => 
          s.toLowerCase().includes(keyword) && 
          s !== species && 
          !similar.includes(s)
        )
        similar.push(...related)
        break
      }
    }
    
    // Return top 5 unique
    return [...new Set(similar)].slice(0, 5)
  }

  const similarSpecies = getSimilarSpecies()
  const [showFullList, setShowFullList] = useState(false)

  if (showManualPicker) {
    // If searching or showing full list, show all species
    const displaySpecies = searchQuery.trim() || showFullList 
      ? filteredSpecies 
      : similarSpecies

    return (
      <div className="mt-3 rounded-xl border border-[#334155] bg-[#243B4A] p-3 text-xs">
        <p className="mb-2 text-[11px] font-medium text-gray-400">
          {searchQuery.trim() || showFullList ? 'Select the correct species:' : 'Similar species:'}
        </p>
        
        {/* Search input */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all species..."
            className="w-full rounded-lg border border-[#334155] bg-[#1A2D3D] py-2 pl-8 pr-3 text-xs text-white focus:border-[#1BA9A0] focus:outline-none focus:ring-1 focus:ring-[#1BA9A0]"
          />
        </div>

        {/* Species list */}
        <div className="max-h-48 overflow-y-auto rounded-lg border border-[#334155] bg-[#1A2D3D]">
          {displaySpecies.length > 0 ? (
            displaySpecies.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelectManual(s)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#334155]"
              >
                <span className="text-base">🐟</span>
                <span className="text-white">{s}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-gray-500">
              No species found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Show all button - only if not searching and not already showing full list */}
        {!searchQuery.trim() && !showFullList && similarSpecies.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFullList(true)}
            className="mt-2 w-full text-center text-[11px] font-medium text-[#1BA9A0] hover:text-[#14B8A6]"
          >
            Show all species →
          </button>
        )}

        {/* Cancel button */}
        <button
          type="button"
          onClick={() => {
            setShowManualPicker(false)
            setShowFullList(false)
            setSearchQuery('')
          }}
          className="mt-2 w-full rounded-lg border border-[#334155] bg-[#1A2D3D] px-3 py-2 text-[11px] font-medium text-gray-300 hover:bg-[#334155]"
        >
          ← Back to AI suggestion
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-[#334155] bg-[#243B4A] p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-gray-400">AI suggestion</p>
          <p className="text-sm font-semibold text-white">{species}</p>
          {scientificName && (
            <p className="text-[11px] italic text-gray-500">{scientificName}</p>
          )}
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${confidenceColor}`}>
          {Math.round(confidence)}% confidence
        </span>
      </div>

      {/* Always show alternatives if available */}
      {alternatives && alternatives.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[11px] font-medium text-gray-400">Could also be:</p>
          <div className="flex flex-wrap gap-1">
            {alternatives.map((alt) => (
              <button
                key={alt}
                type="button"
                onClick={() => onConfirm(alt)}
                className="rounded-full border border-[#334155] bg-[#1A2D3D] px-2 py-0.5 text-[10px] text-gray-300 hover:bg-[#334155]"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(species)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1BA9A0] px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-[#14B8A6] disabled:opacity-70"
        >
          <Check size={12} />
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setShowManualPicker(true)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#334155] bg-[#1A2D3D] px-3 py-2 text-[11px] font-medium text-gray-300 hover:bg-[#334155]"
        >
          <Search size={12} />
          Pick different
        </button>
      </div>
    </div>
  )
}
