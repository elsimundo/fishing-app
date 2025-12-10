import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

interface CatchXPInput {
  catchId: string
  species: string
  weightLb?: number | null
  weightKg?: number | null
  sessionId?: string | null
  hasPhoto?: boolean
  caughtAt?: string | null
  latitude?: number | null
  longitude?: number | null
  // Environmental data for condition-based challenges
  weatherCondition?: string | null
  windSpeed?: number | null
  moonPhase?: string | null
  // Country code for geographic challenges
  countryCode?: string | null
}

interface XPBreakdown {
  base: number
  speciesBonus: number
  weightBonus: number
  photoBonus: number
  weeklySpeciesBonus: number
  total: number
}

interface CatchXPResult {
  xpAwarded: number
  breakdown: XPBreakdown
  newXP: number
  newLevel: number
  leveledUp: boolean
  challengesCompleted: string[]
  weeklySpeciesPoints: number
}

const XP_VALUES = {
  BASE_CATCH: 10,
  BASE_CATCH_NO_PHOTO: 3, // Reduced XP without photo (was 5)
  PHOTO_BONUS: 5,
  WEIGHT_BONUS_PER_5LB: 5,
  NEW_SPECIES_BONUS: 25,
}

const RATE_LIMITS = {
  MAX_CATCHES_PER_HOUR: 10,
  MAX_CATCHES_PER_DAY: 50,
}

// Anti-cheat: minimum session duration (in minutes) for location-based challenges
const MIN_SESSION_DURATION_MINS = 15

/**
 * Hook to process XP and challenge progress when a catch is logged
 */
export function useCatchXP() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (input: CatchXPInput): Promise<CatchXPResult> => {
      if (!user) throw new Error('Not authenticated')
      
      // Rate limiting check
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { count: hourlyCount } = await supabase
        .from('catches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneHourAgo)
      
      const { count: dailyCount } = await supabase
        .from('catches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneDayAgo)
      
      // If rate limited, award no XP but don't error
      if ((hourlyCount || 0) > RATE_LIMITS.MAX_CATCHES_PER_HOUR || 
          (dailyCount || 0) > RATE_LIMITS.MAX_CATCHES_PER_DAY) {
        console.log('Rate limited - no XP awarded')
        return {
          xpAwarded: 0,
          breakdown: { base: 0, speciesBonus: 0, weightBonus: 0, photoBonus: 0, weeklySpeciesBonus: 0, total: 0 },
          newXP: 0,
          newLevel: 1,
          leveledUp: false,
          challengesCompleted: [],
          weeklySpeciesPoints: 0,
        }
      }
      
      // Base XP depends on whether catch has photo
      const breakdown: XPBreakdown = {
        base: input.hasPhoto ? XP_VALUES.BASE_CATCH : XP_VALUES.BASE_CATCH_NO_PHOTO,
        speciesBonus: 0,
        weightBonus: 0,
        photoBonus: 0,
        weeklySpeciesBonus: 0,
        total: 0,
      }
      
      const challengesCompleted: string[] = []
      let weeklySpeciesPoints = 0
      
      // Check if new species for user
      const { data: existingCatches } = await supabase
        .from('catches')
        .select('id')
        .eq('user_id', user.id)
        .ilike('species', input.species)
        .neq('id', input.catchId)
        .limit(1)
      
      if (!existingCatches || existingCatches.length === 0) {
        breakdown.speciesBonus = XP_VALUES.NEW_SPECIES_BONUS
      }
      
      // Weight bonus (5 XP per 5lb)
      if (input.weightLb && input.weightLb > 0) {
        breakdown.weightBonus = Math.floor(input.weightLb / 5) * XP_VALUES.WEIGHT_BONUS_PER_5LB
      }
      
      // Photo bonus
      if (input.hasPhoto) {
        breakdown.photoBonus = XP_VALUES.PHOTO_BONUS
      }
      
      // Weekly species XP bonus check
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const weekStart = new Date(now.setDate(diff))
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split('T')[0]
      
      const { data: weeklyPoints } = await supabase
        .from('weekly_species_points')
        .select('points, is_bonus')
        .eq('week_start', weekStartStr)
        .ilike('species', input.species)
        .maybeSingle()
      
      if (weeklyPoints) {
        // Treat points as direct XP bonus for this species this week
        weeklySpeciesPoints = weeklyPoints.points
        breakdown.weeklySpeciesBonus = weeklyPoints.points
      }
      
      // Calculate total
      breakdown.total = breakdown.base + breakdown.speciesBonus + breakdown.weightBonus + 
                        breakdown.photoBonus + breakdown.weeklySpeciesBonus
      
      // Award XP via database function
      const { data: xpResult, error: xpError } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: breakdown.total,
        p_reason: 'catch_logged',
        p_reference_type: 'catch',
        p_reference_id: input.catchId,
      })
      
      if (xpError) {
        console.error('Failed to award XP:', xpError)
        throw xpError
      }
      
      // Check and update challenges
      // Anti-cheat: Only process challenges if catch has a photo
      // This prevents gaming the system with fake catches
      if (input.hasPhoto) {
        await checkChallenges(user.id, input, challengesCompleted)
      } else {
        console.log('No photo - challenges not processed (add photo within 1 hour to earn challenge progress)')
      }
      
      const result = xpResult?.[0] || { new_xp: 0, new_level: 1, leveled_up: false }
      
      return {
        xpAwarded: breakdown.total,
        breakdown,
        newXP: result.new_xp,
        newLevel: result.new_level,
        leveledUp: result.leveled_up,
        challengesCompleted,
        weeklySpeciesPoints,
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      queryClient.invalidateQueries({ queryKey: ['user-weekly-stats'] })
      
      // Show XP toast
      if (data.xpAwarded > 0) {
        const bonusText = data.weeklySpeciesPoints > 0 
          ? ` (includes +${data.weeklySpeciesPoints} bonus XP for weekly species)` 
          : ''
        toast.success(`+${data.xpAwarded} XP${bonusText}`, { icon: '⭐', duration: 3000 })
      }
      
      // Level up celebration
      if (data.leveledUp) {
        setTimeout(() => {
          toast.success(`Level Up! You're now level ${data.newLevel}! 🎉`, { duration: 5000, icon: '🏆' })
        }, 500)
      }
      
      // Challenge completion
      if (data.challengesCompleted.length > 0) {
        setTimeout(() => {
          toast.success(`Challenge completed! 🏅`, { duration: 4000 })
        }, 1000)
      }
    },
    onError: (error) => {
      console.error('CatchXP error:', error)
      // Don't show error toast - XP is a bonus feature, shouldn't block catch logging
    },
  })
}

/**
 * Check and complete challenges based on catch
 */
async function checkChallenges(userId: string, input: CatchXPInput, completed: string[]) {
  // Get total catch count
  const { count: totalCatches } = await supabase
    .from('catches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  
  // Get unique species count
  const { data: speciesData } = await supabase
    .from('catches')
    .select('species')
    .eq('user_id', userId)
  
  const speciesCount = new Set(speciesData?.map(c => c.species.toLowerCase())).size
  
  // ============================================
  // 1. MILESTONE CHALLENGES (catch count, species count)
  // ============================================
  const milestones = [
    { slug: 'first_catch', type: 'catch', value: 1 },
    { slug: 'catch_10', type: 'catch', value: 10 },
    { slug: 'catch_50', type: 'catch', value: 50 },
    { slug: 'catch_100', type: 'catch', value: 100 },
    { slug: 'catch_500', type: 'catch', value: 500 },
    { slug: 'species_5', type: 'species', value: 5 },
    { slug: 'species_10', type: 'species', value: 10 },
    { slug: 'species_25', type: 'species', value: 25 },
  ]
  
  for (const m of milestones) {
    const current = m.type === 'catch' ? (totalCatches || 0) : speciesCount
    if (current >= m.value) {
      await completeChallenge(userId, m.slug, current, m.value, completed, input.catchId)
    }
  }
  
  // ============================================
  // 2. SPECIES-SPECIFIC CHALLENGES
  // ============================================
  const speciesSlug = `catch_${input.species.toLowerCase().replace(/\s+/g, '_')}`
  await completeChallenge(userId, speciesSlug, 1, 1, completed, input.catchId)
  
  // ============================================
  // 3. PHOTO CHALLENGES
  // ============================================
  if (input.hasPhoto) {
    const { count: photoCount } = await supabase
      .from('catches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('photo_url', 'is', null)
    
    if (photoCount && photoCount >= 10) {
      await completeChallenge(userId, 'photo_pro', photoCount, 10, completed, input.catchId)
    }
    if (photoCount && photoCount >= 50) {
      await completeChallenge(userId, 'photo_master', photoCount, 50, completed, input.catchId)
    }
  }
  
  // ============================================
  // 4. TIME-BASED CHALLENGES (dawn, dusk, night)
  // ============================================
  if (input.caughtAt) {
    const catchTime = new Date(input.caughtAt)
    const hour = catchTime.getHours()
    
    // Dawn Patrol: Catch before 6am
    if (hour >= 4 && hour < 6) {
      await incrementProgressChallenge(userId, 'dawn_patrol', 5, completed, input.catchId)
    }
    
    // Early Bird: Catch before 7am
    if (hour >= 5 && hour < 7) {
      await incrementProgressChallenge(userId, 'early_bird', 10, completed, input.catchId)
    }
    
    // Night Owl: Catch after 10pm or before 5am
    if (hour >= 22 || hour < 5) {
      await incrementProgressChallenge(userId, 'night_owl', 5, completed, input.catchId)
    }
    
    // Golden Hour: Catch during sunset (6pm-8pm)
    if (hour >= 18 && hour < 20) {
      await incrementProgressChallenge(userId, 'golden_hour', 10, completed, input.catchId)
    }
  }
  
  // ============================================
  // 5. WEIGHT-BASED CHALLENGES
  // ============================================
  const weightKg = input.weightKg || (input.weightLb ? input.weightLb / 2.205 : null)
  
  if (weightKg && weightKg > 0) {
    // Big Fish: Catch a fish over 5kg (11lb)
    if (weightKg >= 5) {
      await completeChallenge(userId, 'big_fish', 1, 1, completed, input.catchId)
    }
    
    // Monster Catch: Catch a fish over 10kg (22lb)
    if (weightKg >= 10) {
      await completeChallenge(userId, 'monster_catch', 1, 1, completed, input.catchId)
    }
    
    // Check for specimen weight (compare to species_info)
    const { data: speciesInfo } = await supabase
      .from('species_info')
      .select('specimen_weight_lb')
      .ilike('display_name', input.species)
      .maybeSingle()
    
    if (speciesInfo?.specimen_weight_lb) {
      const specimenWeightKg = speciesInfo.specimen_weight_lb / 2.205
      if (weightKg >= specimenWeightKg) {
        await incrementProgressChallenge(userId, 'specimen_hunter', 5, completed, input.catchId)
      }
    }
  }
  
  // ============================================
  // 6. LOCATION-BASED CHALLENGES
  // Anti-cheat: Only count if session was at least 15 minutes
  // ============================================
  if (input.latitude && input.longitude && input.sessionId) {
    // Check session duration first
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('started_at, ended_at')
      .eq('id', input.sessionId)
      .maybeSingle()
    
    let sessionDurationMins = 0
    if (sessionData?.started_at) {
      const startTime = new Date(sessionData.started_at).getTime()
      const endTime = sessionData.ended_at 
        ? new Date(sessionData.ended_at).getTime() 
        : Date.now() // Use current time if session still active
      sessionDurationMins = (endTime - startTime) / (1000 * 60)
    }
    
    // Only award location challenges if session >= 15 mins
    if (sessionDurationMins >= MIN_SESSION_DURATION_MINS) {
      // Get unique locations from catches with photos in sessions >= 15 mins
      // (rounded to ~1km precision)
      const { data: locations } = await supabase
        .from('catches')
        .select('latitude, longitude')
        .eq('user_id', userId)
        .not('latitude', 'is', null)
        .not('photo_url', 'is', null) // Must have photo
      
      if (locations) {
        const uniqueLocations = new Set(
          locations.map(l => `${Math.round(l.latitude * 100)},${Math.round(l.longitude * 100)}`)
        )
        
        // New Waters: Fish at 5 different locations
        if (uniqueLocations.size >= 5) {
          await completeChallenge(userId, 'new_waters', uniqueLocations.size, 5, completed, input.catchId)
        }
        
        // Explorer: Fish at 10 different locations
        if (uniqueLocations.size >= 10) {
          await completeChallenge(userId, 'explorer', uniqueLocations.size, 10, completed, input.catchId)
        }
        
        // Adventurer: Fish at 25 different locations
        if (uniqueLocations.size >= 25) {
          await completeChallenge(userId, 'adventurer', uniqueLocations.size, 25, completed, input.catchId)
        }
      }
    } else {
      console.log(`Location challenge skipped: session duration ${sessionDurationMins.toFixed(1)} mins < ${MIN_SESSION_DURATION_MINS} mins required`)
    }
  }
  
  // ============================================
  // 7. STREAK/CONSISTENCY CHALLENGES
  // ============================================
  await checkStreakChallenges(userId, completed)
  
  // ============================================
  // 8. WEATHER-BASED CHALLENGES
  // ============================================
  if (input.weatherCondition) {
    const condition = input.weatherCondition.toLowerCase()
    
    // Weather Warrior: Catch in rain
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      await incrementProgressChallenge(userId, 'weather_warrior', 5, completed, input.catchId)
    }
    
    // Storm Chaser: Catch during thunderstorm
    if (condition.includes('thunder') || condition.includes('storm')) {
      await completeChallenge(userId, 'storm_chaser', 1, 1, completed, input.catchId)
    }
    
    // Fog Fisher: Catch in fog
    if (condition.includes('fog') || condition.includes('mist')) {
      await completeChallenge(userId, 'fog_fisher', 1, 1, completed, input.catchId)
    }
    
    // Sunny Fisher: Catch on clear days
    if (condition.includes('clear') || condition.includes('sunny')) {
      await incrementProgressChallenge(userId, 'sunny_fisher', 10, completed, input.catchId)
    }
  }
  
  // Wind Rider: Catch on windy day (15+ mph)
  if (input.windSpeed && input.windSpeed >= 15) {
    await incrementProgressChallenge(userId, 'wind_rider', 5, completed, input.catchId)
  }
  
  // ============================================
  // 9. MOON PHASE CHALLENGES
  // ============================================
  if (input.moonPhase) {
    // Full Moon catch
    if (input.moonPhase === 'Full Moon') {
      await completeChallenge(userId, 'full_moon_catch', 1, 1, completed, input.catchId)
    }
    
    // New Moon catch
    if (input.moonPhase === 'New Moon') {
      await completeChallenge(userId, 'new_moon_catch', 1, 1, completed, input.catchId)
    }
    
    // Track unique moon phases caught
    await checkMoonPhasesChallenge(userId, completed)
  }

  // ============================================
  // 10. COUNTRY-SCOPED CHALLENGES
  // ============================================
  if (input.countryCode) {
    await checkCountryChallenges(userId, input.countryCode, input.species, completed, input.catchId)
  }
}

/**
 * Increment progress on a challenge (for challenges that need multiple completions)
 */
async function incrementProgressChallenge(
  userId: string,
  slug: string,
  target: number,
  completed: string[],
  catchId?: string
) {
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, xp_reward')
    .eq('slug', slug)
    .maybeSingle()
  
  if (!challenge) return
  
  // Get current progress
  const { data: existingRows } = await supabase
    .from('user_challenges')
    .select('progress, completed_at')
    .eq('user_id', userId)
    .eq('challenge_id', challenge.id)
    .limit(1)
  
  const existing = existingRows?.[0]
  if (existing?.completed_at) return // Already completed
  
  const newProgress = (existing?.progress || 0) + 1
  const isComplete = newProgress >= target
  
  const { data: upsertedChallenge } = await supabase
    .from('user_challenges')
    .upsert({
      user_id: userId,
      challenge_id: challenge.id,
      progress: newProgress,
      target,
      completed_at: isComplete ? new Date().toISOString() : null,
      xp_awarded: isComplete ? challenge.xp_reward : 0,
    }, { onConflict: 'user_id,challenge_id' })
    .select('id')
    .single()
  
  // Record the catch that contributed to this challenge
  if (catchId && upsertedChallenge) {
    await supabase
      .from('challenge_catches')
      .upsert({
        user_challenge_id: upsertedChallenge.id,
        catch_id: catchId,
      }, { onConflict: 'user_challenge_id,catch_id' })
      .select()
  }
  
  if (isComplete) {
    await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_amount: challenge.xp_reward,
      p_reason: 'challenge_completed',
      p_reference_type: 'challenge',
      p_reference_id: challenge.id,
    })
    completed.push(slug)
  }
}

/**
 * Check streak-based challenges (weekly warrior, etc.)
 */
async function checkStreakChallenges(userId: string, completed: string[]) {
  // Get catches grouped by week
  const { data: catches } = await supabase
    .from('catches')
    .select('caught_at')
    .eq('user_id', userId)
    .order('caught_at', { ascending: false })
    .limit(100)
  
  if (!catches || catches.length === 0) return
  
  // Calculate weeks with catches
  const weeksWithCatches = new Set<string>()
  catches.forEach(c => {
    const date = new Date(c.caught_at)
    const weekStart = getWeekStart(date)
    weeksWithCatches.add(weekStart.toISOString().split('T')[0])
  })
  
  // Check for consecutive weeks
  const sortedWeeks = Array.from(weeksWithCatches).sort().reverse()
  let consecutiveWeeks = 1
  
  for (let i = 1; i < sortedWeeks.length; i++) {
    const prevWeek = new Date(sortedWeeks[i - 1])
    const currWeek = new Date(sortedWeeks[i])
    const diffDays = (prevWeek.getTime() - currWeek.getTime()) / (1000 * 60 * 60 * 24)
    
    if (diffDays === 7) {
      consecutiveWeeks++
    } else {
      break
    }
  }
  
  // Weekly Warrior: Log catches for 4 consecutive weeks
  if (consecutiveWeeks >= 4) {
    await completeChallenge(userId, 'weekly_warrior', consecutiveWeeks, 4, completed)
  }
  
  // Dedicated Angler: Log catches for 8 consecutive weeks
  if (consecutiveWeeks >= 8) {
    await completeChallenge(userId, 'dedicated_angler', consecutiveWeeks, 8, completed)
  }
}

/**
 * Check moon phases challenge (catch during 4 different phases)
 */
async function checkMoonPhasesChallenge(userId: string, completed: string[]) {
  const { data: catches } = await supabase
    .from('catches')
    .select('moon_phase')
    .eq('user_id', userId)
    .not('moon_phase', 'is', null)
  
  if (!catches) return
  
  const uniquePhases = new Set(catches.map(c => c.moon_phase))
  
  if (uniquePhases.size >= 4) {
    await completeChallenge(userId, 'moon_master', uniquePhases.size, 4, completed)
  }
}

/**
 * Check and complete country-scoped challenges
 */
async function checkCountryChallenges(
  userId: string,
  countryCode: string,
  species: string,
  completed: string[],
  catchId?: string
) {
  const cc = countryCode.toLowerCase()
  
  // Get catch count for this country
  const { count: countryCatches } = await supabase
    .from('catches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('country_code', countryCode)
  
  // Get unique species count for this country
  const { data: countrySpeciesData } = await supabase
    .from('catches')
    .select('species')
    .eq('user_id', userId)
    .eq('country_code', countryCode)
  
  const countrySpeciesCount = new Set(countrySpeciesData?.map(c => c.species.toLowerCase())).size
  
  // Country-specific milestones
  // First catch in country
  if (countryCatches && countryCatches >= 1) {
    await completeChallenge(userId, `${cc}_first_catch`, countryCatches, 1, completed, catchId)
  }
  
  // 10 catches in country
  if (countryCatches && countryCatches >= 10) {
    await completeChallenge(userId, `${cc}_explorer_10`, countryCatches, 10, completed, catchId)
  }
  
  // 50 catches in country
  if (countryCatches && countryCatches >= 50) {
    await completeChallenge(userId, `${cc}_explorer_50`, countryCatches, 50, completed, catchId)
  }
  
  // 100 catches in country
  if (countryCatches && countryCatches >= 100) {
    await completeChallenge(userId, `${cc}_explorer_100`, countryCatches, 100, completed, catchId)
  }
  
  // 5 species in country
  if (countrySpeciesCount >= 5) {
    await completeChallenge(userId, `${cc}_species_5`, countrySpeciesCount, 5, completed, catchId)
  }
  
  // 10 species in country
  if (countrySpeciesCount >= 10) {
    await completeChallenge(userId, `${cc}_species_10`, countrySpeciesCount, 10, completed, catchId)
  }
  
  // ============================================
  // MULTI-COUNTRY CHALLENGES (World Traveler, etc.)
  // ============================================
  
  // Get all unique countries the user has fished in
  const { data: allCountries } = await supabase
    .from('catches')
    .select('country_code')
    .eq('user_id', userId)
    .not('country_code', 'is', null)
  
  const uniqueCountries = new Set(allCountries?.map(c => c.country_code)).size
  
  // International Angler: 3 countries
  if (uniqueCountries >= 3) {
    await completeChallenge(userId, 'world_traveler_3', uniqueCountries, 3, completed, catchId)
  }
  
  // World Traveler: 5 countries
  if (uniqueCountries >= 5) {
    await completeChallenge(userId, 'world_traveler_5', uniqueCountries, 5, completed, catchId)
  }
  
  // Globe Trotter: 10 countries
  if (uniqueCountries >= 10) {
    await completeChallenge(userId, 'world_traveler_10', uniqueCountries, 10, completed, catchId)
  }
  
  // European Tour: 3 European countries
  const europeanCountries = ['GB', 'PT', 'ES', 'FR', 'DE', 'NL', 'BE', 'IE', 'IT', 'GR', 'HR', 'PL', 'CZ', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI']
  const userEuropeanCountries = new Set(
    allCountries?.filter(c => europeanCountries.includes(c.country_code)).map(c => c.country_code)
  ).size
  
  if (userEuropeanCountries >= 3) {
    await completeChallenge(userId, 'european_tour', userEuropeanCountries, 3, completed, catchId)
  }
  
  // Update user's countries_fished array in profile
  const countriesArray = Array.from(new Set(allCountries?.map(c => c.country_code) || []))
  await supabase
    .from('profiles')
    .update({ countries_fished: countriesArray })
    .eq('id', userId)
}

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Complete a challenge if not already completed
 */
async function completeChallenge(
  userId: string, 
  slug: string, 
  progress: number, 
  target: number,
  completed: string[],
  catchId?: string
) {
  // Get challenge
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, xp_reward')
    .eq('slug', slug)
    .maybeSingle()
  
  if (!challenge) return
  
  // Check if already completed
  const { data: existingRows } = await supabase
    .from('user_challenges')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('challenge_id', challenge.id)
    .limit(1)
  
  const existing = existingRows?.[0]
  if (existing?.completed_at) return
  
  // Complete the challenge
  const { data: upsertedChallenge } = await supabase
    .from('user_challenges')
    .upsert({
      user_id: userId,
      challenge_id: challenge.id,
      progress,
      target,
      completed_at: new Date().toISOString(),
      xp_awarded: challenge.xp_reward,
    }, { onConflict: 'user_id,challenge_id' })
    .select('id')
    .single()
  
  // Record the catch that contributed to this challenge
  if (catchId && upsertedChallenge) {
    await supabase
      .from('challenge_catches')
      .upsert({
        user_challenge_id: upsertedChallenge.id,
        catch_id: catchId,
      }, { onConflict: 'user_challenge_id,catch_id' })
      .select()
  }
  
  // Award challenge XP
  await supabase.rpc('award_xp', {
    p_user_id: userId,
    p_amount: challenge.xp_reward,
    p_reason: 'challenge_completed',
    p_reference_type: 'challenge',
    p_reference_id: challenge.id,
  })
  
  completed.push(slug)
}

/**
 * Hook to award XP when a session is completed
 */
export function useSessionXP() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ sessionId, catchCount }: { sessionId: string; catchCount: number }) => {
      if (!user) throw new Error('Not authenticated')
      
      // Base XP + bonus for catches (max 20)
      const baseXP = 15
      const catchBonus = Math.min(catchCount * 2, 20)
      const totalXP = baseXP + catchBonus
      
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: totalXP,
        p_reason: 'session_completed',
        p_reference_type: 'session',
        p_reference_id: sessionId,
      })
      
      if (error) throw error
      
      // Check session milestone challenges
      const { count: sessionCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
      
      const completed: string[] = []
      
      if (sessionCount && sessionCount >= 1) {
        await completeChallenge(user.id, 'first_session', sessionCount, 1, completed)
      }
      if (sessionCount && sessionCount >= 10) {
        await completeChallenge(user.id, 'session_10', sessionCount, 10, completed)
      }
      
      return {
        ...(data?.[0] || { new_xp: 0, new_level: 1, leveled_up: false }),
        totalXP,
        challengesCompleted: completed,
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      
      toast.success(`Session complete! +${data.totalXP} XP`, { icon: '✅', duration: 3000 })
      
      if (data.leveled_up) {
        setTimeout(() => {
          toast.success(`Level Up! You're now level ${data.new_level}! 🎉`, { duration: 5000, icon: '🏆' })
        }, 500)
      }
      
      if (data.challengesCompleted.length > 0) {
        setTimeout(() => {
          toast.success(`Challenge completed! 🏅`, { duration: 4000 })
        }, 1000)
      }
    },
  })
}

/**
 * Hook to reverse XP when a catch is deleted
 */
export function useReverseCatchXP() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (catchId: string) => {
      if (!user) throw new Error('Not authenticated')
      
      // Find the XP transaction for this catch
      const { data: transaction } = await supabase
        .from('xp_transactions')
        .select('id, amount')
        .eq('user_id', user.id)
        .eq('reference_type', 'catch')
        .eq('reference_id', catchId)
        .maybeSingle()
      
      if (!transaction || transaction.amount <= 0) {
        return { reversed: false, amount: 0 }
      }
      
      // Get current XP and subtract
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user.id)
        .single()
      
      const newXP = Math.max(0, (profile?.xp || 0) - transaction.amount)
      
      await supabase
        .from('profiles')
        .update({ xp: newXP, level: calculateLevel(newXP) })
        .eq('id', user.id)
      
      // Mark transaction as reversed (negative amount)
      await supabase
        .from('xp_transactions')
        .update({ amount: -transaction.amount })
        .eq('id', transaction.id)
      
      return { reversed: true, amount: transaction.amount }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      
      if (data.reversed && data.amount > 0) {
        toast(`-${data.amount} XP (catch deleted)`, { icon: '↩️', duration: 2000 })
      }
    },
    onError: (error) => {
      console.error('Failed to reverse XP:', error)
    },
  })
}

/**
 * Hook to process XP bonus when a photo is added to a catch within the grace period
 * This allows users to add photos after logging and still get full XP + challenge progress
 */
export function usePhotoAddedXP() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (input: {
      catchId: string
      species: string
      caughtAt: string
      sessionId?: string | null
      latitude?: number | null
      longitude?: number | null
      weightKg?: number | null
      weatherCondition?: string | null
      windSpeed?: number | null
      moonPhase?: string | null
    }) => {
      if (!user) throw new Error('Not authenticated')
      
      // Check if within 1-hour grace period
      const caughtTime = new Date(input.caughtAt).getTime()
      const now = Date.now()
      const hourInMs = 60 * 60 * 1000
      
      if (now - caughtTime > hourInMs) {
        console.log('Photo added after 1-hour grace period - no bonus XP')
        return { xpAwarded: 0, challengesProcessed: false }
      }
      
      // Check if we already awarded full XP for this catch
      const { data: existingTransaction } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('reference_type', 'catch')
        .eq('reference_id', input.catchId)
        .maybeSingle()
      
      // If already got 10+ XP, they had a photo originally
      if (existingTransaction && existingTransaction.amount >= XP_VALUES.BASE_CATCH) {
        console.log('Full XP already awarded for this catch')
        return { xpAwarded: 0, challengesProcessed: false }
      }
      
      // Award the difference (full XP - reduced XP) + photo bonus
      const bonusXP = (XP_VALUES.BASE_CATCH - XP_VALUES.BASE_CATCH_NO_PHOTO) + XP_VALUES.PHOTO_BONUS
      
      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: bonusXP,
        p_reason: 'photo_added',
        p_reference_type: 'catch',
        p_reference_id: input.catchId,
      })
      
      // Now process challenges since we have a photo
      const challengesCompleted: string[] = []
      await checkChallenges(user.id, {
        catchId: input.catchId,
        species: input.species,
        hasPhoto: true,
        caughtAt: input.caughtAt,
        sessionId: input.sessionId,
        latitude: input.latitude,
        longitude: input.longitude,
        weightKg: input.weightKg,
        weightLb: input.weightKg ? input.weightKg * 2.205 : null,
        weatherCondition: input.weatherCondition,
        windSpeed: input.windSpeed,
        moonPhase: input.moonPhase,
      }, challengesCompleted)
      
      return { xpAwarded: bonusXP, challengesProcessed: true, challengesCompleted }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      
      if (data.xpAwarded > 0) {
        toast.success(`+${data.xpAwarded} XP for adding photo!`, { icon: '📸', duration: 3000 })
      }
      
      if (data.challengesCompleted && data.challengesCompleted.length > 0) {
        setTimeout(() => {
          toast.success(`Challenge completed! 🏅`, { duration: 4000 })
        }, 500)
      }
    },
    onError: (error) => {
      console.error('PhotoAddedXP error:', error)
    },
  })
}

/**
 * Calculate level from XP (same formula as database)
 */
function calculateLevel(xp: number): number {
  if (xp < 100) return 1
  if (xp < 300) return 2
  if (xp < 600) return 3
  if (xp < 1000) return 4
  if (xp < 1500) return 5
  if (xp < 2100) return 6
  if (xp < 2800) return 7
  if (xp < 3600) return 8
  if (xp < 4500) return 9
  if (xp < 5500) return 10
  // Beyond level 10: every 1000 XP
  return 10 + Math.floor((xp - 5500) / 1000)
}
