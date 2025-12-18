import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Clock } from 'lucide-react'

export type VerificationLevel = 'pending' | 'unverified' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'rejected'

interface VerificationBadgeProps {
  level: VerificationLevel
  score?: number
  showScore?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const VERIFICATION_CONFIG: Record<VerificationLevel, {
  icon: string
  label: string
  color: string
  bgColor: string
  description: string
}> = {
  platinum: {
    icon: '💎',
    label: 'Platinum',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    description: 'Competition-grade verification',
  },
  gold: {
    icon: '🥇',
    label: 'Gold',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    description: 'Highly trusted, badge eligible',
  },
  silver: {
    icon: '🥈',
    label: 'Silver',
    color: 'text-gray-300',
    bgColor: 'bg-gray-400/20',
    description: 'Verified, full XP awarded',
  },
  bronze: {
    icon: '🥉',
    label: 'Bronze',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    description: 'Basic verification, 50% XP',
  },
  unverified: {
    icon: '❌',
    label: 'Unverified',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    description: 'No XP awarded',
  },
  pending: {
    icon: '⏳',
    label: 'Pending',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    description: 'Verification in progress',
  },
  rejected: {
    icon: '🚫',
    label: 'Rejected',
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    description: 'Manually rejected',
  },
}

/**
 * Badge showing catch verification level
 */
export function VerificationBadge({ 
  level, 
  score, 
  showScore = false,
  size = 'md',
  showLabel = true,
}: VerificationBadgeProps) {
  const config = VERIFICATION_CONFIG[level] || VERIFICATION_CONFIG.pending
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }

  return (
    <div 
      className={`inline-flex items-center rounded-full font-medium ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
      title={config.description}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
      {showScore && score !== undefined && (
        <span className="opacity-70">({score})</span>
      )}
    </div>
  )
}

/**
 * Compact shield icon for verification status
 */
export function VerificationIcon({ 
  level, 
  size = 16 
}: { 
  level: VerificationLevel
  size?: number 
}) {
  const config = VERIFICATION_CONFIG[level] || VERIFICATION_CONFIG.pending

  const IconComponent = {
    platinum: ShieldCheck,
    gold: ShieldCheck,
    silver: ShieldCheck,
    bronze: Shield,
    unverified: ShieldAlert,
    pending: ShieldQuestion,
    rejected: ShieldAlert,
  }[level] || ShieldQuestion

  return (
    <IconComponent 
      size={size} 
      className={config.color}
      aria-label={config.label}
    />
  )
}

/**
 * Full verification status card with details
 */
export function VerificationCard({ 
  level, 
  score,
  details,
}: { 
  level: VerificationLevel
  score: number
  details?: {
    signals?: string[]
    penalties?: string[]
  }
}) {
  const config = VERIFICATION_CONFIG[level] || VERIFICATION_CONFIG.pending

  return (
    <div className={`rounded-xl border border-border p-4 ${config.bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h4 className={`font-semibold ${config.color}`}>{config.label} Verified</h4>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${config.color}`}>{score}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </div>
      </div>

      {details && (
        <div className="space-y-2 text-xs">
          {details.signals && details.signals.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1">Signals detected:</p>
              <div className="flex flex-wrap gap-1">
                {details.signals.map((signal, i) => (
                  <span 
                    key={i}
                    className="inline-flex items-center rounded bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5"
                  >
                    +{signal.split(':')[1]} {signal.split(':')[0].replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {details.penalties && details.penalties.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1">Penalties:</p>
              <div className="flex flex-wrap gap-1">
                {details.penalties.map((penalty, i) => (
                  <span 
                    key={i}
                    className="inline-flex items-center rounded bg-red-500/20 text-red-400 px-1.5 py-0.5"
                  >
                    {penalty.split(':')[1]} {penalty.split(':')[0].replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Pending verification indicator with clock
 */
export function PendingVerification() {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock size={12} className="animate-pulse" />
      <span>Verifying...</span>
    </div>
  )
}

/**
 * XP multiplier indicator based on verification level
 */
export function XPMultiplierBadge({ level }: { level: VerificationLevel }) {
  const multipliers: Record<VerificationLevel, { value: string; color: string }> = {
    platinum: { value: '100%', color: 'text-cyan-400' },
    gold: { value: '100%', color: 'text-yellow-400' },
    silver: { value: '100%', color: 'text-gray-300' },
    bronze: { value: '50%', color: 'text-orange-400' },
    unverified: { value: '0%', color: 'text-red-400' },
    pending: { value: '—', color: 'text-muted-foreground' },
    rejected: { value: '0%', color: 'text-red-500' },
  }

  const { value, color } = multipliers[level] || multipliers.pending

  return (
    <span className={`text-xs font-medium ${color}`}>
      {value} XP
    </span>
  )
}
