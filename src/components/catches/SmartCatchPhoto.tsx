import { useState, useEffect } from 'react'
import { Camera, Loader2, AlertCircle, MapPin, Clock } from 'lucide-react'
import type { FishIdentificationResult } from '../../types/fish'
import { useFishIdentification } from '../../hooks/useFishIdentification'
import { SpeciesConfirmation } from './SpeciesConfirmation'
import { extractPhotoMetadata, type PhotoMetadata } from '../../utils/exifExtractor'

interface SmartCatchPhotoProps {
  onSpeciesIdentified: (result: FishIdentificationResult) => void
  onPhotoChange: (file: File | null) => void
  onMetadataExtracted?: (metadata: PhotoMetadata) => void
  initialPhotoFile?: File | null
  initialMetadata?: PhotoMetadata | null
}

export function SmartCatchPhoto({ 
  onSpeciesIdentified, 
  onPhotoChange, 
  onMetadataExtracted,
  initialPhotoFile,
  initialMetadata,
}: SmartCatchPhotoProps) {
  const { identifyFish, loading, result, error, reset } = useFishIdentification()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<PhotoMetadata | null>(initialMetadata || null)

  // Set initial photo if provided
  useEffect(() => {
    if (initialPhotoFile) {
      const objectUrl = URL.createObjectURL(initialPhotoFile)
      setPreviewUrl(objectUrl)
      onPhotoChange(initialPhotoFile)
      
      return () => {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [initialPhotoFile, onPhotoChange])

  const handleFileChange = async (file: File | null) => {
    onPhotoChange(file)

    if (!file) {
      setPreviewUrl(null)
      setMetadata(null)
      reset()
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    // Extract EXIF metadata in parallel with AI identification
    const metadataPromise = extractPhotoMetadata(file)
    const aiPromise = identifyFish(file)

    const [extractedMetadata] = await Promise.all([metadataPromise, aiPromise])
    
    console.log('[SmartCatchPhoto] EXIF metadata extracted:', extractedMetadata)
    setMetadata(extractedMetadata)
    if (onMetadataExtracted) {
      onMetadataExtracted(extractedMetadata)
    }
  }

  const handleSpeciesConfirm = (species: string) => {
    if (!result) return
    onSpeciesIdentified({ ...result, species })
    reset()
  }

  const handleReject = () => {
    reset()
  }

  return (
    <div className="mb-4 rounded-xl border border-[#334155] bg-[#1A2D3D] p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1BA9A0]/20 text-[#1BA9A0]">
          <Camera size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold text-white">Smart species detection</p>
          <p className="text-[11px] text-gray-400">Take a clear photo of the fish to auto-detect the species.</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <label
          htmlFor="smart-photo"
          className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-[#334155] bg-[#243B4A] px-3 py-2 text-[11px] text-gray-400 hover:bg-[#334155]"
        >
          <div className="flex items-center gap-2">
            <Camera size={14} className="text-gray-500" />
            <span>Tap to take a photo or choose from gallery</span>
          </div>
          <span className="text-[10px] text-gray-500">JPG/PNG/WebP up to 5MB</span>
        </label>
        <input
          id="smart-photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            void handleFileChange(file)
          }}
        />

        {previewUrl ? (
          <div className="overflow-hidden rounded-lg border border-[#334155] bg-black/20">
            <img src={previewUrl} alt="Catch preview" className="h-40 w-full object-cover" />
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 rounded-lg bg-[#243B4A] px-3 py-2 text-[11px] text-gray-300">
            <Loader2 size={14} className="animate-spin" />
            <span>Identifying fish...</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-500/40 px-3 py-2 text-[11px] text-red-400">
            <AlertCircle size={14} className="mt-0.5" />
            <div>
              <p className="font-medium">Could not identify fish</p>
              <p className="text-[11px]">{error.message}</p>
            </div>
          </div>
        ) : null}

        {result ? <SpeciesConfirmation result={result} onConfirm={handleSpeciesConfirm} onReject={handleReject} /> : null}

        {metadata ? (
          metadata.hasGPS || metadata.hasTimestamp ? (
            <div className="rounded-lg bg-emerald-900/30 border border-emerald-500/40 px-3 py-2 text-[11px] text-emerald-400">
              <p className="font-medium mb-1">📸 Photo metadata detected:</p>
              <div className="space-y-0.5 text-emerald-400">
                {metadata.hasGPS ? (
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span>GPS location found - auto-filled below</span>
                  </div>
                ) : null}
                {metadata.hasTimestamp ? (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Photo timestamp found - auto-filled below</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-900/30 border border-amber-500/40 px-3 py-2 text-[11px] text-amber-400">
              <p className="font-medium mb-1">📍 No location data in photo</p>
              <p className="text-amber-400">
                Mobile browsers remove location data for privacy. Use the "Use my current location" button or map picker below to set your location.
              </p>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
