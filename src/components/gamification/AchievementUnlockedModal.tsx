import { useEffect, useState, useRef } from 'react'
import { X, Share2, Check } from 'lucide-react'
import { createPortal } from 'react-dom'

interface AchievementUnlockedModalProps {
  isOpen: boolean
  onClose: () => void
  achievement: {
    title: string
    description: string
    icon: string
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
    xpReward: number
    category?: string
  }
  onShare?: () => void
  levelUp?: {
    newLevel: number
    tier: string
  } | null
}

const RARITY_CONFIG = {
  common: {
    label: 'Common',
    bgGradient: 'from-slate-600 to-slate-700',
    borderColor: 'border-slate-400',
    textColor: 'text-slate-300',
    glowColor: 'shadow-slate-500/50',
    stars: 1,
  },
  uncommon: {
    label: 'Uncommon',
    bgGradient: 'from-emerald-600 to-emerald-700',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-300',
    glowColor: 'shadow-emerald-500/50',
    stars: 2,
  },
  rare: {
    label: 'Rare',
    bgGradient: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-300',
    glowColor: 'shadow-blue-500/50',
    stars: 3,
  },
  epic: {
    label: 'Epic',
    bgGradient: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-300',
    glowColor: 'shadow-purple-500/50',
    stars: 4,
  },
  legendary: {
    label: 'Legendary',
    bgGradient: 'from-amber-500 via-yellow-500 to-orange-500',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-300',
    glowColor: 'shadow-yellow-500/60',
    stars: 5,
  },
}

// Generate confetti particles
function generateConfetti(count: number) {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    size: 8 + Math.random() * 8,
  }))
}

export function AchievementUnlockedModal({
  isOpen,
  onClose,
  achievement,
  onShare,
  levelUp,
}: AchievementUnlockedModalProps) {
  const [showContent, setShowContent] = useState(false)
  const [confetti, setConfetti] = useState<ReturnType<typeof generateConfetti>>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Generate confetti
      setConfetti(generateConfetti(50))
      
      // Animate content in after a short delay
      const timer = setTimeout(() => setShowContent(true), 100)
      
      // Play sound (if available)
      try {
        audioRef.current = new Audio('/sounds/achievement.mp3')
        audioRef.current.volume = 0.5
        audioRef.current.play().catch(() => {
          // Sound file not available, that's fine
        })
      } catch {
        // Audio not supported
      }

      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }

      return () => {
        clearTimeout(timer)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }
      }
    } else {
      setShowContent(false)
      setConfetti([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const config = RARITY_CONFIG[achievement.rarity]

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${particle.x}%`,
              top: '-20px',
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          >
            <div
              className="rounded-sm"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                transform: `rotate(${particle.rotation}deg)`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Modal Content */}
      <div 
        className={`
          relative z-10 w-[90%] max-w-sm transform transition-all duration-500
          ${showContent ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/70 hover:bg-black/70 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Card */}
        <div className={`
          overflow-hidden rounded-2xl border-2 ${config.borderColor}
          bg-gradient-to-b from-slate-900 to-slate-950
          shadow-2xl ${config.glowColor}
        `}>
          {/* Header Glow Effect */}
          <div className={`
            absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full
            bg-gradient-to-b ${config.bgGradient} opacity-30 blur-3xl
          `} />

          {/* Unlock Banner */}
          <div className={`
            relative bg-gradient-to-r ${config.bgGradient} px-4 py-2 text-center
          `}>
            <p className="text-xs font-bold uppercase tracking-widest text-white/90">
              ✨ Achievement Unlocked ✨
            </p>
          </div>

          {/* Content */}
          <div className="relative px-6 py-8 text-center">
            {/* Icon with glow */}
            <div className={`
              mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl
              bg-gradient-to-br ${config.bgGradient}
              shadow-lg ${config.glowColor}
              animate-achievement-glow
            `}>
              <span className="text-5xl">{achievement.icon}</span>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-2xl font-bold text-white">
              {achievement.title}
            </h2>

            {/* Description */}
            <p className="mb-4 text-sm text-white/70">
              {achievement.description}
            </p>

            {/* Rarity Stars */}
            <div className="mb-4 flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-lg ${i < config.stars ? 'text-yellow-400' : 'text-white/20'}`}
                >
                  ★
                </span>
              ))}
            </div>

            {/* Rarity Badge */}
            <div className={`
              mb-4 inline-flex items-center gap-2 rounded-full
              bg-gradient-to-r ${config.bgGradient} px-4 py-1.5
            `}>
              <span className={`text-xs font-bold uppercase tracking-wide ${config.textColor}`}>
                {config.label}
              </span>
            </div>

            {/* XP Reward */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2">
                <span className="text-2xl font-bold text-emerald-400">+{achievement.xpReward}</span>
                <span className="text-sm font-medium text-emerald-300">XP</span>
              </div>
            </div>

            {/* Level Up Banner (if applicable) */}
            {levelUp && (
              <div className="mb-6 animate-pulse rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-yellow-400">
                  🎉 Level Up!
                </p>
                <p className="text-3xl font-bold text-white">
                  Level {levelUp.newLevel}
                </p>
                <p className="text-sm text-yellow-300/80">{levelUp.tier} Tier</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onShare}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Share2 size={18} />
                Share
              </button>
              <button
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                <Check size={18} />
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// Simpler inline notification for less important achievements
export function AchievementToast({
  achievement,
  onClose,
}: {
  achievement: { title: string; icon: string; xpReward: number }
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="animate-slide-in-right fixed right-4 top-4 z-[100] flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-900/90 px-4 py-3 shadow-xl backdrop-blur-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/30 text-xl">
        {achievement.icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{achievement.title}</p>
        <p className="text-xs text-emerald-300">+{achievement.xpReward} XP</p>
      </div>
      <button
        onClick={onClose}
        className="ml-2 text-white/50 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  )
}
