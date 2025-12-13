import { ArrowUpDown } from 'lucide-react'

export type SortOption = 'distance' | 'date'

interface SortSelectorProps {
  value: SortOption
  onChange: (value: SortOption) => void
  hasUserLocation: boolean
}

export function SortSelector({ value, onChange, hasUserLocation }: SortSelectorProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#243B4A] p-2 text-xs shadow-sm">
      <ArrowUpDown size={14} className="text-gray-500" />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => hasUserLocation && onChange('distance')}
          disabled={!hasUserLocation}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            value === 'distance' && hasUserLocation
              ? 'bg-[#1BA9A0] text-white'
              : hasUserLocation
              ? 'text-gray-300 hover:bg-[#1A2D3D]'
              : 'cursor-not-allowed text-gray-600'
          }`}
        >
          <span className="mr-1">📍</span>
          Nearest
        </button>
        <button
          type="button"
          onClick={() => onChange('date')}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            value === 'date' ? 'bg-[#1BA9A0] text-white' : 'text-gray-300 hover:bg-[#1A2D3D]'
          }`}
        >
          <span className="mr-1">📅</span>
          Recent
        </button>
      </div>
    </div>
  )
}
