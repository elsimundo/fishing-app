import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Loader2, AlertCircle, Search } from 'lucide-react'
import { useFishIdentification } from '../hooks/useFishIdentification'
import { SpeciesConfirmation } from '../components/catches/SpeciesConfirmation'
import { SpeciesInfoCard } from '../components/fish/SpeciesInfoCard'
import { getAllSpecies } from '../lib/constants'
import { useFreshwaterEnabled } from '../hooks/useFeatureFlags'
import type { FishIdentificationResult } from '../types/fish'
import { extractPhotoMetadata, type PhotoMetadata } from '../utils/exifExtractor'

type Mode = 'choose' | 'photo' | 'search'

export function FishIdentifierPage() {
  const navigate = useNavigate()
  const { identifyFish, loading, result, error, reset } = useFishIdentification()
  const freshwaterEnabled = useFreshwaterEnabled()
  const [mode, setMode] = useState<Mode>('choose')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<PhotoMetadata | null>(null)
  const [confirmedResult, setConfirmedResult] = useState<FishIdentificationResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // Get species list based on freshwater feature flag
  const allSpecies = getAllSpecies(freshwaterEnabled)

  // Filter species based on search query
  const filteredSpecies = searchQuery.trim()
    ? allSpecies.filter((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : allSpecies

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    // Extract EXIF metadata in parallel with AI identification
    const metadataPromise = extractPhotoMetadata(file)
    const aiPromise = identifyFish(file)

    const [extractedMetadata] = await Promise.all([metadataPromise, aiPromise])
    
    console.log('[FishIdentifier] EXIF metadata extracted:', extractedMetadata)
    setMetadata(extractedMetadata)
  }

  const handleSpeciesConfirm = (species: string) => {
    if (!result) return
    setConfirmedResult({ ...result, species })
  }

  const handleReject = () => {
    reset()
    setConfirmedResult(null)
  }

  const handleLogCatch = () => {
    if (!confirmedResult || !photoFile) return

    // Navigate to catch form with pre-filled data
    navigate('/catches/new', {
      state: {
        aiResult: confirmedResult,
        photoFile: photoFile,
        metadata: metadata,
      },
    })
  }

  const handleSelectSpecies = (species: string) => {
    setSelectedSpecies(species)
    setSearchQuery(species)
    setShowDropdown(false)
  }

  const handleReset = () => {
    setMode('choose')
    setPreviewUrl(null)
    setPhotoFile(null)
    setMetadata(null)
    setConfirmedResult(null)
    setSelectedSpecies(null)
    setSearchQuery('')
    reset()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Fish Identifier</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl p-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          {/* Mode Selection */}
          {mode === 'choose' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                  <Search size={32} className="text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Fish Identifier</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Identify a fish and learn about legal sizes, best baits, rigs, and records
                </p>
              </div>

              {/* Option 1: AI Photo */}
              <button
                type="button"
                onClick={() => setMode('photo')}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-colors hover:border-amber-400 hover:bg-amber-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                  <Camera size={24} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Upload a Photo</p>
                  <p className="text-sm text-gray-600">AI will identify the species for you</p>
                </div>
              </button>

              {/* Option 2: Search */}
              <button
                type="button"
                onClick={() => setMode('search')}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-colors hover:border-cyan-400 hover:bg-cyan-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100">
                  <Search size={24} className="text-cyan-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Search by Name</p>
                  <p className="text-sm text-gray-600">Browse our species database</p>
                </div>
              </button>
            </div>
          )}

          {/* Search Mode */}
          {mode === 'search' && !selectedSpecies && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search for a species..."
                  className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  autoFocus
                />
              </div>

              {/* Species Dropdown */}
              {showDropdown && (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {filteredSpecies.length > 0 ? (
                    filteredSpecies.map((species) => (
                      <button
                        key={species}
                        type="button"
                        onClick={() => handleSelectSpecies(species)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="text-lg">🐟</span>
                        <span className="text-gray-900">{species}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No species found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Search Result - Species Info */}
          {mode === 'search' && selectedSpecies && (
            <div className="space-y-4">
              <SpeciesInfoCard
                speciesName={selectedSpecies}
                showLogButton
                onLogCatch={() => {
                  navigate('/catches/new', {
                    state: {
                      aiResult: { species: selectedSpecies },
                    },
                  })
                }}
              />

              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Search Another Species
              </button>
            </div>
          )}

          {/* Photo Upload Mode */}
          {mode === 'photo' && !previewUrl && (
            <div className="space-y-4">
              <label className="block">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="fish-photo"
                />
                <label
                  htmlFor="fish-photo"
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 transition-colors hover:border-amber-400 hover:bg-amber-50"
                >
                  <Camera size={40} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Tap to choose a photo</span>
                  <span className="text-xs text-gray-500">JPG, PNG or WebP</span>
                </label>
              </label>

              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs font-medium text-blue-900">💡 Tips for best results:</p>
                <ul className="mt-2 space-y-1 text-xs text-blue-800">
                  <li>• Clear, well-lit photo of the fish</li>
                  <li>• Show the whole fish if possible</li>
                  <li>• Avoid blurry or dark images</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Photo Preview & AI Results */}
          {mode === 'photo' && previewUrl && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={previewUrl}
                  alt="Fish preview"
                  className="h-64 w-full object-cover"
                />
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center gap-3 rounded-lg bg-blue-50 py-6">
                  <Loader2 size={20} className="animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Identifying fish...</p>
                </div>
              ) : null}

              {/* Error State */}
              {error ? (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle size={14} className="mt-0.5" />
                  <div>
                    <p className="font-medium">Could not identify fish</p>
                    <p className="text-xs">{error.message}</p>
                  </div>
                </div>
              ) : null}

              {/* Species Confirmation */}
              {result && !confirmedResult ? (
                <SpeciesConfirmation
                  result={result}
                  onConfirm={handleSpeciesConfirm}
                  onReject={handleReject}
                />
              ) : null}

              {/* Confirmed Result - Show Species Info Card */}
              {confirmedResult ? (
                <div className="space-y-4">
                  {/* Species Info Card */}
                  <SpeciesInfoCard speciesName={confirmedResult.species} />

                  {/* EXIF Metadata Info */}
                  {metadata && (metadata.hasGPS || metadata.hasTimestamp) ? (
                    <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                      <p className="font-medium mb-1">📸 Photo metadata detected:</p>
                      <div className="space-y-0.5 text-blue-700">
                        {metadata.hasGPS ? <p>• GPS location found</p> : null}
                        {metadata.hasTimestamp ? <p>• Photo timestamp found</p> : null}
                      </div>
                    </div>
                  ) : null}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleLogCatch}
                      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      Log as Catch
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Identify Another Fish
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Try Another Photo */}
              {!loading && !confirmedResult ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Try Another Photo
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
