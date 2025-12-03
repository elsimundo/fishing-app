import { ArrowUpDown } from 'lucide-react'

export type SortOption = 'distance' | 'date'

interface SortSelectorProps {
  value: SortOption
  onChange: (value: SortOption) => void
  hasUserLocation: boolean
}

export function SortSelector({ value, onChange, hasUserLocation }: SortSelectorProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-sm">
      <ArrowUpDown size={14} className="text-slate-400" />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => hasUserLocation && onChange('distance')}
          disabled={!hasUserLocation}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            value === 'distance' && hasUserLocation
              ? 'bg-slate-900 text-white'
              : hasUserLocation
              ? 'text-slate-700 hover:bg-slate-100'
              : 'cursor-not-allowed text-slate-400'
          }`}
        >
          <span className="mr-1">📍</span>
          Nearest
        </button>
        <button
          type="button"
          onClick={() => onChange('date')}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            value === 'date' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="mr-1">📅</span>
          Recent
        </button>
      </div>
    </div>
  )
}
