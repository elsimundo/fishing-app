import { supabase } from './supabase'

export type MilestoneType = 
  | 'badge'           // Badge/challenge completed
  | 'level_up'        // Reached new level
  | 'personal_best'   // New heaviest catch
  | 'new_species'     // First catch of a species
  | 'catch_milestone' // 10th, 50th, 100th catch etc
  | 'streak'          // 7 day, 30 day streak
  | 'competition_win' // Won or placed in competition

export interface MilestonePostData {
  type: MilestoneType
  title: string           // e.g., "Night Owl" badge name
  description?: string    // e.g., "Caught 5 fish after 10pm"
  emoji?: string          // e.g., "🦉"
  value?: number          // e.g., 5.2 for weight, 10 for level
  unit?: string           // e.g., "kg", "catches"
  imageUrl?: string       // Optional photo (for PB catches)
  referenceId?: string    // ID of related entity (catch, challenge, etc)
  referenceType?: string  // Type of reference (catch, challenge, competition)
}

/**
 * Create an auto-post for a milestone achievement.
 * Respects user's privacy settings and auto-share preference.
 */
export async function createMilestonePost(
  userId: string,
  data: MilestonePostData
): Promise<boolean> {
  try {
    // Check user's profile settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_private, auto_share_achievements')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.warn('[createMilestonePost] Failed to load profile:', profileError)
      return false
    }

    // Check if auto-share is enabled (default to true if column doesn't exist yet)
    const autoShare = profile?.auto_share_achievements ?? true
    if (!autoShare) {
      return false
    }

    // Build caption based on milestone type
    const caption = buildMilestoneCaption(data)

    // Create the post
    const { error: postError } = await supabase.from('posts').insert({
      user_id: userId,
      type: 'achievement',
      caption,
      is_public: !profile?.is_private,
      metadata: {
        milestone_type: data.type,
        title: data.title,
        description: data.description,
        emoji: data.emoji,
        value: data.value,
        unit: data.unit,
        reference_id: data.referenceId,
        reference_type: data.referenceType,
      },
      photo_url: data.imageUrl || null,
    })

    if (postError) {
      console.warn('[createMilestonePost] Failed to create post:', postError)
      return false
    }

    return true
  } catch (err) {
    console.warn('[createMilestonePost] Unexpected error:', err)
    return false
  }
}

/**
 * Build a caption string for the milestone post
 */
function buildMilestoneCaption(data: MilestonePostData): string {
  const emoji = data.emoji || getDefaultEmoji(data.type)
  
  switch (data.type) {
    case 'badge':
      return `${emoji} Earned the "${data.title}" badge!${data.description ? ` ${data.description}` : ''}`
    
    case 'level_up':
      return `${emoji} Reached Level ${data.value}! 🎉`
    
    case 'personal_best':
      return `${emoji} New personal best! ${data.value}${data.unit || 'kg'} ${data.title}`
    
    case 'new_species':
      return `${emoji} Caught my first ever ${data.title}!`
    
    case 'catch_milestone':
      return `${emoji} Just logged my ${data.value}${getOrdinalSuffix(data.value || 0)} catch!`
    
    case 'streak':
      return `${emoji} ${data.value} day fishing streak! 🔥`
    
    case 'competition_win':
      return `${emoji} ${data.title}${data.description ? ` - ${data.description}` : ''}`
    
    default:
      return `${emoji} ${data.title}`
  }
}

function getDefaultEmoji(type: MilestoneType): string {
  switch (type) {
    case 'badge': return '🏆'
    case 'level_up': return '⬆️'
    case 'personal_best': return '🎣'
    case 'new_species': return '🐟'
    case 'catch_milestone': return '📊'
    case 'streak': return '🔥'
    case 'competition_win': return '🥇'
    default: return '✨'
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/**
 * Convenience functions for specific milestone types
 */

export async function postBadgeEarned(
  userId: string,
  badgeName: string,
  badgeDescription: string,
  emoji?: string,
  challengeId?: string
): Promise<boolean> {
  return createMilestonePost(userId, {
    type: 'badge',
    title: badgeName,
    description: badgeDescription,
    emoji,
    referenceId: challengeId,
    referenceType: 'challenge',
  })
}

export async function postLevelUp(
  userId: string,
  newLevel: number
): Promise<boolean> {
  return createMilestonePost(userId, {
    type: 'level_up',
    title: `Level ${newLevel}`,
    value: newLevel,
    emoji: '⬆️',
  })
}

export async function postPersonalBest(
  userId: string,
  species: string,
  weightKg: number,
  catchId: string,
  photoUrl?: string
): Promise<boolean> {
  return createMilestonePost(userId, {
    type: 'personal_best',
    title: species,
    value: weightKg,
    unit: 'kg',
    emoji: '🎣',
    imageUrl: photoUrl,
    referenceId: catchId,
    referenceType: 'catch',
  })
}

export async function postNewSpecies(
  userId: string,
  species: string,
  catchId: string,
  photoUrl?: string
): Promise<boolean> {
  return createMilestonePost(userId, {
    type: 'new_species',
    title: species,
    emoji: '🐟',
    imageUrl: photoUrl,
    referenceId: catchId,
    referenceType: 'catch',
  })
}

export async function postCatchMilestone(
  userId: string,
  catchCount: number
): Promise<boolean> {
  return createMilestonePost(userId, {
    type: 'catch_milestone',
    title: `${catchCount} catches`,
    value: catchCount,
    emoji: '📊',
  })
}

export async function postStreak(
  userId: string,
  streakDays: number
): Promise<boolean> {
  return createMilestonePost(userId, {
    type: 'streak',
    title: `${streakDays} day streak`,
    value: streakDays,
    emoji: '🔥',
  })
}

export async function postCompetitionResult(
  userId: string,
  competitionName: string,
  placement: number,
  competitionId: string
): Promise<boolean> {
  const placementEmoji = placement === 1 ? '🥇' : placement === 2 ? '🥈' : placement === 3 ? '🥉' : '🏆'
  const placementText = placement === 1 ? 'Won' : `Placed ${placement}${getOrdinalSuffix(placement)} in`
  
  return createMilestonePost(userId, {
    type: 'competition_win',
    title: `${placementText} ${competitionName}`,
    value: placement,
    emoji: placementEmoji,
    referenceId: competitionId,
    referenceType: 'competition',
  })
}
