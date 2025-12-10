import type { FishIdentificationResult } from '../../types/fish'
import { Check, X } from 'lucide-react'

interface SpeciesConfirmationProps {
  result: FishIdentificationResult
  onConfirm: (species: string) => void
  onReject: () => void
}

export function SpeciesConfirmation({ result, onConfirm, onReject }: SpeciesConfirmationProps) {
  const { species, scientificName, confidence, alternatives } = result

  const confidenceColor =
    confidence >= 80 ? 'bg-emerald-100 text-emerald-800' : confidence >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-slate-600">AI suggestion</p>
          <p className="text-sm font-semibold text-slate-900">{species}</p>
          <p className="text-[11px] italic text-slate-500">{scientificName}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${confidenceColor}`}>
          {Math.round(confidence)}% confidence
        </span>
      </div>

      {confidence < 80 && alternatives.length > 0 ? (
        <div className="mt-2">
          <p className="mb-1 text-[11px] font-medium text-slate-600">Could also be:</p>
          <div className="flex flex-wrap gap-1">
            {alternatives.map((alt) => (
              <button
                key={alt}
                type="button"
                onClick={() => onConfirm(alt)}
                className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-50"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(species)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-navy-800 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-navy-900 disabled:opacity-70"
        >
          <Check size={12} />
          Confirm species
        </button>
        <button
          type="button"
          onClick={onReject}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
        >
          <X size={12} />
          Choose different
        </button>
      </div>
    </div>
  )
}
