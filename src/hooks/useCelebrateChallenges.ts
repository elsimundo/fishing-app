import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAchievementCelebration, getLevelTierName, type AchievementData } from './useAchievementCelebration.tsx'

/**
 * Hook that provides a function to celebrate completed challenges.
 * Call this when challenges are completed to show the celebration modal.
 */
export function useCelebrateChallenges() {
  const { celebrate, celebrateMultiple } = useAchievementCelebration()

  const celebrateChallenges = useCallback(async (
    challengeSlugs: string[],
    levelUp?: { newLevel: number; leveledUp: boolean } | null
  ) => {
    console.log('[Celebration] celebrateChallenges called with:', challengeSlugs, levelUp)
    if (challengeSlugs.length === 0) {
      console.log('[Celebration] No challenges to celebrate')
      return
    }

    // Fetch challenge details for all completed challenges
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('id, title, description, icon, difficulty, xp_reward, category, rarity')
      .in('slug', challengeSlugs)

    console.log('[Celebration] Fetched challenges:', challenges, 'error:', error)

    if (!challenges || challenges.length === 0) {
      console.log('[Celebration] No challenges found in database for slugs:', challengeSlugs)
      return
    }

    // Convert to AchievementData format
    const achievements: AchievementData[] = challenges.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      icon: c.icon,
      rarity: c.rarity || difficultyToRarity(c.difficulty),
      xpReward: c.xp_reward,
      category: c.category,
      completedAt: new Date().toISOString(),
    }))

    // Prepare level up data if applicable
    const levelUpData = levelUp?.leveledUp ? {
      newLevel: levelUp.newLevel,
      tier: getLevelTierName(levelUp.newLevel),
    } : null

    // Trigger celebration(s)
    console.log('[Celebration] Triggering celebration for', achievements.length, 'achievements')
    if (achievements.length === 1) {
      console.log('[Celebration] Calling celebrate() with:', achievements[0])
      celebrate(achievements[0], levelUpData)
    } else {
      console.log('[Celebration] Calling celebrateMultiple() with:', achievements)
      celebrateMultiple(achievements, levelUpData)
    }
  }, [celebrate, celebrateMultiple])

  return { celebrateChallenges }
}

function difficultyToRarity(difficulty: string): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
  switch (difficulty) {
    case 'easy': return 'common'
    case 'medium': return 'uncommon'
    case 'hard': return 'rare'
    case 'expert': return 'epic'
    case 'legendary': return 'legendary'
    default: return 'common'
  }
}
