import { useState } from 'react'
import { Camera, Loader2, AlertCircle } from 'lucide-react'
import type { FishIdentificationResult } from '../../types/fish'
import { useFishIdentification } from '../../hooks/useFishIdentification'
import { SpeciesConfirmation } from './SpeciesConfirmation'

interface SmartCatchPhotoProps {
  onSpeciesIdentified: (result: FishIdentificationResult) => void
  onPhotoChange: (file: File | null) => void
}

export function SmartCatchPhoto({ onSpeciesIdentified, onPhotoChange }: SmartCatchPhotoProps) {
  const { identifyFish, loading, result, error, reset } = useFishIdentification()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = async (file: File | null) => {
    onPhotoChange(file)

    if (!file) {
      setPreviewUrl(null)
      reset()
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    await identifyFish(file)
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
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800/10 text-navy-800">
          <Camera size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-900">Smart species detection</p>
          <p className="text-[11px] text-slate-500">Take a clear photo of the fish to auto-detect the species.</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <label
          htmlFor="smart-photo"
          className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <Camera size={14} className="text-slate-500" />
            <span>Tap to take a photo or choose from gallery</span>
          </div>
          <span className="text-[10px] text-slate-400">JPG/PNG/WebP up to 5MB</span>
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
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-black/5">
            <img src={previewUrl} alt="Catch preview" className="h-40 w-full object-cover" />
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-700">
            <Loader2 size={14} className="animate-spin" />
            <span>Identifying fish5</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">
            <AlertCircle size={14} className="mt-0.5" />
            <div>
              <p className="font-medium">Could not identify fish</p>
              <p className="text-[11px]">{error.message}</p>
            </div>
          </div>
        ) : null}

        {result ? <SpeciesConfirmation result={result} onConfirm={handleSpeciesConfirm} onReject={handleReject} /> : null}
      </div>
    </div>
  )
}
