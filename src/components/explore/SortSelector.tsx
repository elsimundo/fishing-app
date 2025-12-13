import { ArrowUpDown } from 'lucide-react'

export type SortOption = 'distance' | 'date'

interface SortSelectorProps {
  value: SortOption
  onChange: (value: SortOption) => void
  hasUserLocation: boolean
}

export function SortSelector({ value, onChange, hasUserLocation }: SortSelectorProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 text-xs shadow-sm">
      <ArrowUpDown size={14} className="text-muted-foreground" />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => hasUserLocation && onChange('distance')}
          disabled={!hasUserLocation}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            value === 'distance' && hasUserLocation
              ? 'bg-primary text-white'
              : hasUserLocation
              ? 'text-muted-foreground hover:bg-muted'
              : 'cursor-not-allowed text-muted-foreground/50'
          }`}
        >
          <span className="mr-1">📍</span>
          Nearest
        </button>
        <button
          type="button"
          onClick={() => onChange('date')}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            value === 'date' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <span className="mr-1">📅</span>
          Recent
        </button>
      </div>
    </div>
  )
}
