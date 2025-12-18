import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import type { VerificationLevel } from './VerificationBadge'

interface VerificationSignal {
  name: string
  passed: boolean
  points: number
  description: string
}

interface VerificationFeedbackProps {
  level: VerificationLevel
  score: number
  signals: VerificationSignal[]
  aiSpeciesSuggestions?: string[]
  onRetakePhoto?: () => void
  showRetakeOption?: boolean
}

/**
 * Shows detailed breakdown of what passed/failed verification
 * and allows user to retake photo for better AI match
 */
export function VerificationFeedback({
  level,
  score,
  signals,
  aiSpeciesSuggestions = [],
  onRetakePhoto,
  showRetakeOption = true,
}: VerificationFeedbackProps) {
  const passedSignals = signals.filter(s => s.passed)
  const failedSignals = signals.filter(s => !s.passed)
  
  const levelConfig: Record<VerificationLevel, { color: string; icon: string; label: string }> = {
    platinum: { color: 'text-cyan-400', icon: '💎', label: 'Platinum Verified' },
    gold: { color: 'text-yellow-400', icon: '🥇', label: 'Gold Verified' },
    silver: { color: 'text-gray-300', icon: '🥈', label: 'Silver Verified' },
    bronze: { color: 'text-orange-400', icon: '🥉', label: 'Bronze Verified' },
    unverified: { color: 'text-red-400', icon: '❌', label: 'Not Verified' },
    pending: { color: 'text-muted-foreground', icon: '⏳', label: 'Pending' },
    rejected: { color: 'text-red-500', icon: '🚫', label: 'Rejected' },
  }

  const config = levelConfig[level] || levelConfig.pending

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <p className={`font-semibold ${config.color}`}>{config.label}</p>
            <p className="text-xs text-muted-foreground">Verification score: {score}/100</p>
          </div>
        </div>
        <div className={`text-2xl font-bold ${config.color}`}>{score}</div>
      </div>

      {/* What passed */}
      {passedSignals.length > 0 && (
        <div>
          <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
            <CheckCircle size={12} />
            Verified signals ({passedSignals.length})
          </p>
          <div className="space-y-1">
            {passedSignals.map((signal, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-emerald-400" />
                  <span className="text-foreground">{signal.name}</span>
                </div>
                <span className="text-emerald-400">+{signal.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What failed */}
      {failedSignals.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
            <AlertCircle size={12} />
            Missing signals ({failedSignals.length})
          </p>
          <div className="space-y-1">
            {failedSignals.map((signal, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <XCircle size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground">{signal.name}</span>
                </div>
                <span className="text-muted-foreground">+{signal.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI species suggestions */}
      {aiSpeciesSuggestions.length > 0 && (
        <div className="rounded-lg bg-background border border-border p-3">
          <p className="text-xs font-medium text-foreground mb-2">
            🐟 AI thinks this might be:
          </p>
          <div className="flex flex-wrap gap-1">
            {aiSpeciesSuggestions.map((species, i) => (
              <span 
                key={i}
                className="inline-flex items-center rounded-full bg-primary/20 text-primary px-2 py-0.5 text-xs"
              >
                {species}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Retake photo option */}
      {showRetakeOption && onRetakePhoto && (
        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={onRetakePhoto}
            className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <RefreshCw size={12} />
            Take a clearer photo for better AI recognition
          </button>
        </div>
      )}

      {/* XP impact message */}
      <div className="text-[11px] text-muted-foreground">
        {level === 'platinum' || level === 'gold' || level === 'silver' ? (
          <span className="text-emerald-400">✓ This catch earns full XP and is badge-eligible</span>
        ) : level === 'bronze' ? (
          <span className="text-amber-400">⚠ This catch earns 50% XP. Add a clearer photo for full XP.</span>
        ) : (
          <span className="text-red-400">✗ This catch won't earn XP. Add a photo with GPS/timestamp.</span>
        )}
      </div>
    </div>
  )
}

/**
 * Helper to convert verification details from DB to signals array
 */
export function parseVerificationDetails(details: {
  signals?: string[]
  penalties?: string[]
}): VerificationSignal[] {
  const allPossibleSignals: Record<string, { name: string; points: number; description: string }> = {
    has_photo: { name: 'Photo attached', points: 15, description: 'Catch has a photo' },
    exif_gps: { name: 'Photo GPS location', points: 20, description: 'Photo contains GPS coordinates' },
    gps_match_100m: { name: 'GPS matches (100m)', points: 25, description: 'Photo GPS within 100m of catch' },
    gps_match_500m: { name: 'GPS matches (500m)', points: 15, description: 'Photo GPS within 500m of catch' },
    exif_timestamp: { name: 'Photo timestamp', points: 15, description: 'Photo contains timestamp' },
    time_match_15min: { name: 'Time matches (15 min)', points: 15, description: 'Photo within 15 min of catch' },
    time_match_1hr: { name: 'Time matches (1 hour)', points: 10, description: 'Photo within 1 hour of catch' },
    in_session: { name: 'Logged during session', points: 10, description: 'Catch logged during active session' },
    near_session: { name: 'Near session location', points: 10, description: 'Within 1km of session' },
    ai_species_match: { name: 'AI species confirmed', points: 10, description: 'AI confirmed the species' },
    camera_info: { name: 'Camera metadata', points: 5, description: 'Photo has camera info (not screenshot)' },
    weather_data: { name: 'Weather recorded', points: 5, description: 'Weather data captured' },
  }

  const result: VerificationSignal[] = []
  const passedSignalKeys = new Set<string>()

  // Parse passed signals
  if (details.signals) {
    for (const signal of details.signals) {
      const [key, pointsStr] = signal.split(':')
      const signalInfo = allPossibleSignals[key]
      if (signalInfo) {
        passedSignalKeys.add(key)
        result.push({
          name: signalInfo.name,
          passed: true,
          points: parseInt(pointsStr) || signalInfo.points,
          description: signalInfo.description,
        })
      }
    }
  }

  // Add key missing signals (not all, just important ones)
  const importantSignals = ['has_photo', 'exif_gps', 'exif_timestamp', 'ai_species_match']
  for (const key of importantSignals) {
    if (!passedSignalKeys.has(key) && allPossibleSignals[key]) {
      result.push({
        name: allPossibleSignals[key].name,
        passed: false,
        points: allPossibleSignals[key].points,
        description: allPossibleSignals[key].description,
      })
    }
  }

  return result
}
