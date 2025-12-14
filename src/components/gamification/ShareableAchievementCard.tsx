import { useRef, useState } from 'react'
import { Share2, Copy, Check, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'sonner'

interface ShareableAchievementCardProps {
  achievement: {
    title: string
    description: string
    icon: string
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
    xpReward: number
    completedAt?: string
  }
  username: string
  onClose: () => void
}

const RARITY_CONFIG = {
  common: {
    label: 'Common',
    gradient: 'from-slate-600 to-slate-800',
    border: '#64748b',
    accent: '#94a3b8',
  },
  uncommon: {
    label: 'Uncommon',
    gradient: 'from-emerald-600 to-emerald-800',
    border: '#10b981',
    accent: '#6ee7b7',
  },
  rare: {
    label: 'Rare',
    gradient: 'from-blue-600 to-blue-800',
    border: '#3b82f6',
    accent: '#93c5fd',
  },
  epic: {
    label: 'Epic',
    gradient: 'from-purple-600 to-purple-800',
    border: '#8b5cf6',
    accent: '#c4b5fd',
  },
  legendary: {
    label: 'Legendary',
    gradient: 'from-amber-500 to-orange-600',
    border: '#f59e0b',
    accent: '#fcd34d',
  },
}

export function ShareableAchievementCard({
  achievement,
  username,
  onClose,
}: ShareableAchievementCardProps) {
  const { user } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const config = RARITY_CONFIG[achievement.rarity]
  const completedDate = achievement.completedAt
    ? new Date(achievement.completedAt).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  // Track share for analytics
  const trackShare = async (platform: string) => {
    if (!user) return
    try {
      await supabase.from('achievement_shares').insert({
        user_id: user.id,
        challenge_id: null, // Would need to pass challenge_id
        platform,
      })
    } catch {
      // Non-critical, don't show error
    }
  }

  // Share using Web Share API (mobile-friendly)
  const handleNativeShare = async () => {
    if (!navigator.share) {
      toast.error('Sharing not supported on this device')
      return
    }

    setIsSharing(true)
    try {
      await navigator.share({
        title: `🏆 ${achievement.title}`,
        text: `I just unlocked "${achievement.title}" on Fishing App! ${achievement.description}`,
        url: window.location.origin,
      })
      await trackShare('native_share')
      toast.success('Shared successfully!')
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share')
      }
    } finally {
      setIsSharing(false)
    }
  }

  // Copy message + link to clipboard
  const handleCopyLink = async () => {
    const text = `🏆 Achievement Unlocked: ${achievement.title}!\n\n${achievement.description}\n\n+${achievement.xpReward} XP earned on Fishing App 🎣\n\n${window.location.origin}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      await trackShare('copy_link')
      toast.success('Copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  // Share to Facebook
  const handleFacebookShare = () => {
    const url = encodeURIComponent(window.location.origin)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(`🏆 I just unlocked "${achievement.title}" on Fishing App! +${achievement.xpReward} XP 🎣`)}`, '_blank')
    trackShare('facebook')
  }

  // Share to WhatsApp
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🏆 Achievement Unlocked: ${achievement.title}!\n\n${achievement.description}\n\n+${achievement.xpReward} XP earned on Fishing App 🎣\n\n${window.location.origin}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
    trackShare('whatsapp')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md">
        {/* The Card (for screenshot/sharing) */}
        <div
          ref={cardRef}
          className={`
            relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient}
            p-6 shadow-2xl
          `}
          style={{ borderColor: config.border, borderWidth: 2 }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20" />
            <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="relative mb-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">
              🎣 Fishing App
            </p>
          </div>

          {/* Achievement Icon */}
          <div className="relative mb-4 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/20 text-6xl shadow-lg backdrop-blur-sm">
              {achievement.icon}
            </div>
          </div>

          {/* Title & Description */}
          <div className="relative mb-4 text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">{achievement.title}</h2>
            <p className="text-sm text-white/80">{achievement.description}</p>
          </div>

          {/* Rarity & XP */}
          <div className="relative mb-4 flex items-center justify-center gap-4">
            <div
              className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: config.accent, color: config.border }}
            >
              {config.label}
            </div>
            <div className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white">
              +{achievement.xpReward} XP
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between border-t border-white/20 pt-4 text-xs text-white/60">
            <span>@{username}</span>
            <span>{completedDate}</span>
          </div>
        </div>

        {/* Share Actions */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {'share' in navigator && (
            <button
              onClick={handleNativeShare}
              disabled={isSharing}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-white/90 disabled:opacity-50"
            >
              <Share2 size={16} />
              Share
            </button>
          )}
          
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#20bd5a]"
          >
            <MessageCircle size={16} />
            WhatsApp
          </button>
          
          <button
            onClick={handleFacebookShare}
            className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#166fe5]"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
          
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/30"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          Done
        </button>
      </div>
    </div>
  )
}
