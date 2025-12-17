export type SpeciesTier = 'common' | 'standard' | 'trophy' | 'rare'

export interface AppSetting {
  key: string
  value: string | number | boolean
  description?: string
  category: 'xp' | 'rules' | 'system' | 'general'
  updated_at: string
}

export interface SpeciesTierRecord {
  species: string
  tier: SpeciesTier
  base_xp: number
  updated_at: string
}

export const XP_SETTING_KEYS = {
  // Tier XP values
  TIER_COMMON: 'xp_tier_common',
  TIER_STANDARD: 'xp_tier_standard',
  TIER_TROPHY: 'xp_tier_trophy',
  TIER_RARE: 'xp_tier_rare',
  
  // Bonuses
  FIRST_SPECIES: 'xp_first_species',
  PB_MULTIPLIER: 'xp_pb_multiplier',
  RELEASED_BONUS: 'xp_released_bonus',
  FULL_DETAILS_BONUS: 'xp_full_details_bonus',
  
  // Session
  START_SESSION: 'xp_start_session',
  
  // Referral
  REFERRAL_SIGNUP: 'xp_referral_signup',
  
  // Rules
  REQUIRE_PHOTO: 'xp_require_photo',
  BACKLOG_EARNS: 'xp_backlog_earns',
  
  // System
  SYSTEM_ENABLED: 'xp_system_enabled',
  LEADERBOARD_ENABLED: 'leaderboard_enabled',
  CHALLENGES_ENABLED: 'challenges_enabled',
} as const

export type XPSettingKey = typeof XP_SETTING_KEYS[keyof typeof XP_SETTING_KEYS]

export const DEFAULT_XP_VALUES: Record<string, number | boolean> = {
  [XP_SETTING_KEYS.TIER_COMMON]: 5,
  [XP_SETTING_KEYS.TIER_STANDARD]: 10,
  [XP_SETTING_KEYS.TIER_TROPHY]: 15,
  [XP_SETTING_KEYS.TIER_RARE]: 20,
  [XP_SETTING_KEYS.FIRST_SPECIES]: 25,
  [XP_SETTING_KEYS.PB_MULTIPLIER]: 2,
  [XP_SETTING_KEYS.RELEASED_BONUS]: 5,
  [XP_SETTING_KEYS.FULL_DETAILS_BONUS]: 5,
  [XP_SETTING_KEYS.START_SESSION]: 5,
  [XP_SETTING_KEYS.REFERRAL_SIGNUP]: 50,
  [XP_SETTING_KEYS.REQUIRE_PHOTO]: true,
  [XP_SETTING_KEYS.BACKLOG_EARNS]: false,
  [XP_SETTING_KEYS.SYSTEM_ENABLED]: true,
  [XP_SETTING_KEYS.LEADERBOARD_ENABLED]: true,
  [XP_SETTING_KEYS.CHALLENGES_ENABLED]: true,
}

export const XP_SETTING_LABELS: Record<string, { label: string; description: string }> = {
  [XP_SETTING_KEYS.TIER_COMMON]: {
    label: 'Common Species XP',
    description: 'Base XP for common/pest fish (Mackerel, Whiting, etc.)',
  },
  [XP_SETTING_KEYS.TIER_STANDARD]: {
    label: 'Standard Species XP',
    description: 'Base XP for regular species (Bass, Pollack, Carp, etc.)',
  },
  [XP_SETTING_KEYS.TIER_TROPHY]: {
    label: 'Trophy Species XP',
    description: 'Base XP for trophy species (Cod, Tope, Pike, etc.)',
  },
  [XP_SETTING_KEYS.TIER_RARE]: {
    label: 'Rare Species XP',
    description: 'Base XP for rare species (Turbot, Blue Shark, etc.)',
  },
  [XP_SETTING_KEYS.FIRST_SPECIES]: {
    label: 'First Species Bonus',
    description: 'Bonus XP for catching a species for the first time',
  },
  [XP_SETTING_KEYS.PB_MULTIPLIER]: {
    label: 'PB Multiplier',
    description: 'XP multiplier when setting a personal best',
  },
  [XP_SETTING_KEYS.RELEASED_BONUS]: {
    label: 'Released Bonus',
    description: 'Bonus XP for releasing a catch',
  },
  [XP_SETTING_KEYS.FULL_DETAILS_BONUS]: {
    label: 'Full Details Bonus',
    description: 'Bonus XP for logging weight, length, bait, and rig',
  },
  [XP_SETTING_KEYS.START_SESSION]: {
    label: 'Start Session XP',
    description: 'XP awarded for starting a fishing session',
  },
  [XP_SETTING_KEYS.REFERRAL_SIGNUP]: {
    label: 'Referral Signup XP',
    description: 'XP when a referred friend signs up',
  },
  [XP_SETTING_KEYS.REQUIRE_PHOTO]: {
    label: 'Require Photo for XP',
    description: 'Catches must have a photo to earn XP',
  },
  [XP_SETTING_KEYS.BACKLOG_EARNS]: {
    label: 'Backlog Catches Earn XP',
    description: 'Allow backlog catches to earn XP',
  },
  [XP_SETTING_KEYS.SYSTEM_ENABLED]: {
    label: 'XP System Enabled',
    description: 'Master toggle for the entire XP system',
  },
  [XP_SETTING_KEYS.LEADERBOARD_ENABLED]: {
    label: 'Leaderboards Enabled',
    description: 'Show leaderboards throughout the app',
  },
  [XP_SETTING_KEYS.CHALLENGES_ENABLED]: {
    label: 'Challenges Enabled',
    description: 'Enable the challenge/badge system',
  },
}
