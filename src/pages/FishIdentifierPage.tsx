import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Loader2, AlertCircle } from 'lucide-react'
import { useFishIdentification } from '../hooks/useFishIdentification'
import { SpeciesConfirmation } from '../components/catches/SpeciesConfirmation'
import type { FishIdentificationResult } from '../types/fish'
import { extractPhotoMetadata, type PhotoMetadata } from '../utils/exifExtractor'

export function FishIdentifierPage() {
  const navigate = useNavigate()
  const { identifyFish, loading, result, error, reset } = useFishIdentification()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<PhotoMetadata | null>(null)
  const [confirmedResult, setConfirmedResult] = useState<FishIdentificationResult | null>(null)

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

  const handleDone = () => {
    navigate(-1)
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
          {/* Upload Section */}
          {!previewUrl ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                  <Camera size={32} className="text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Identify Your Fish</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Upload a photo and our AI will identify the species for you
                </p>
              </div>

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
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 transition-colors hover:border-amber-400 hover:bg-amber-50"
                >
                  <Camera size={20} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Choose Photo</span>
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
            </div>
          ) : (
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

              {/* Confirmed Result */}
              {confirmedResult ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">✅</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-900">
                          Fish Identified!
                        </p>
                        <p className="mt-1 text-lg font-bold text-emerald-900">
                          {confirmedResult.species}
                        </p>
                        {confirmedResult.scientificName ? (
                          <p className="mt-0.5 text-xs italic text-emerald-700">
                            {confirmedResult.scientificName}
                          </p>
                        ) : null}
                        {confirmedResult.confidence ? (
                          <p className="mt-2 text-xs text-emerald-700">
                            {Math.round(confirmedResult.confidence * 100)}% confidence
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

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
                      className="w-full rounded-lg bg-navy-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-900"
                    >
                      Log as Catch
                    </button>
                    <button
                      type="button"
                      onClick={handleDone}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Try Another Photo */}
              {!loading && !confirmedResult ? (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl(null)
                    setPhotoFile(null)
                    setMetadata(null)
                    reset()
                  }}
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
