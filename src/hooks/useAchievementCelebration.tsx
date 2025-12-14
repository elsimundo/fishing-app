import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Challenge } from './useGamification'

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface AchievementData {
  id: string
  title: string
  description: string
  icon: string
  rarity: AchievementRarity
  xpReward: number
  category?: string
  completedAt?: string
}

interface LevelUpData {
  newLevel: number
  tier: string
}

interface CelebrationContextValue {
  queue: AchievementData[]
  current: AchievementData | null
  levelUp: LevelUpData | null
  isOpen: boolean
  isShareOpen: boolean
  celebrate: (achievement: AchievementData, levelUp?: LevelUpData | null) => void
  celebrateMultiple: (achievements: AchievementData[], levelUp?: LevelUpData | null) => void
  closeAndShowNext: () => void
  openShare: () => void
  closeShare: () => void
  clearAll: () => void
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null)

export function AchievementCelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AchievementData[]>([])
  const [current, setCurrent] = useState<AchievementData | null>(null)
  const [levelUp, setLevelUp] = useState<LevelUpData | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  const celebrate = useCallback((achievement: AchievementData, levelUpData: LevelUpData | null = null) => {
    console.log('[CelebrationProvider] celebrate() called with:', achievement, 'current:', current)
    if (!current) {
      console.log('[CelebrationProvider] Setting current achievement and opening modal')
      setCurrent(achievement)
      setLevelUp(levelUpData)
      setIsOpen(true)
    } else {
      console.log('[CelebrationProvider] Adding to queue, current already set')
      setQueue(prev => [...prev, achievement])
    }
  }, [current])

  const celebrateMultiple = useCallback((achievements: AchievementData[], levelUpData: LevelUpData | null = null) => {
    if (achievements.length === 0) return
    const [first, ...rest] = achievements
    setCurrent(first)
    setQueue(rest)
    setLevelUp(levelUpData)
    setIsOpen(true)
  }, [])

  const closeAndShowNext = useCallback(() => {
    if (queue.length > 0) {
      const [next, ...rest] = queue
      setCurrent(next)
      setQueue(rest)
      setLevelUp(null)
    } else {
      setCurrent(null)
      setIsOpen(false)
      setLevelUp(null)
    }
  }, [queue])

  const openShare = useCallback(() => setIsShareOpen(true), [])
  const closeShare = useCallback(() => setIsShareOpen(false), [])
  const clearAll = useCallback(() => {
    setQueue([])
    setCurrent(null)
    setLevelUp(null)
    setIsOpen(false)
    setIsShareOpen(false)
  }, [])

  return (
    <CelebrationContext.Provider value={{
      queue,
      current,
      levelUp,
      isOpen,
      isShareOpen,
      celebrate,
      celebrateMultiple,
      closeAndShowNext,
      openShare,
      closeShare,
      clearAll,
    }}>
      {children}
    </CelebrationContext.Provider>
  )
}

export function useAchievementCelebration() {
  const context = useContext(CelebrationContext)
  if (!context) {
    throw new Error('useAchievementCelebration must be used within AchievementCelebrationProvider')
  }
  return context
}

// Helper to convert Challenge to AchievementData
export function challengeToAchievement(challenge: Challenge, completedAt?: string): AchievementData {
  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    icon: challenge.icon,
    rarity: (challenge as any).rarity || difficultyToRarity(challenge.difficulty),
    xpReward: challenge.xp_reward,
    category: challenge.category,
    completedAt,
  }
}

// Map difficulty to rarity (fallback)
function difficultyToRarity(difficulty: string): AchievementRarity {
  switch (difficulty) {
    case 'easy': return 'common'
    case 'medium': return 'uncommon'
    case 'hard': return 'rare'
    case 'expert': return 'epic'
    case 'legendary': return 'legendary'
    default: return 'common'
  }
}

// Get level tier name
export function getLevelTierName(level: number): string {
  if (level >= 50) return 'Diamond'
  if (level >= 30) return 'Platinum'
  if (level >= 20) return 'Gold'
  if (level >= 10) return 'Silver'
  return 'Bronze'
}
