import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

/**
 * Calculate level from XP - faster early progression
 */
function calculateLevel(xp: number): number {
  if (xp < 50) return 1
  if (xp < 120) return 2
  if (xp < 220) return 3
  if (xp < 350) return 4
  if (xp < 520) return 5
  if (xp < 750) return 6
  if (xp < 1050) return 7
  if (xp < 1400) return 8
  if (xp < 1800) return 9
  if (xp < 2300) return 10
  return 10 + Math.floor((xp - 2300) / 600)
}

/**
 * Reverse challenges that are no longer valid after catch deletion
 */
async function reverseAffectedChallenges(
  userId: string, 
  species: string, 
  hadPhoto: boolean,
  challengesLost: string[]
) {
  // Fetch all remaining catches (single source of truth)
  const { data: catches } = await supabase
    .from('catches')
    .select('species, photo_url, latitude, longitude, caught_at, weather_condition, moon_phase, weight_kg, country_code')
    .eq('user_id', userId)

  const catchRows = (catches ?? []) as CatchRow[]
  const totalCatches = catchRows.length

  const uniqueSpecies = new Set(catchRows.map(c => c.species.toLowerCase()))
  const speciesCount = uniqueSpecies.size

  // Check if user still has this species
  const stillHasSpecies = uniqueSpecies.has(species.toLowerCase())
  
  // If they no longer have this species, reverse the species-specific challenge
  if (!stillHasSpecies) {
    const speciesSlug = `catch_${species.toLowerCase().replace(/\s+/g, '_')}`
    await reverseChallenge(userId, speciesSlug, challengesLost)
  }
  
  // Check milestone challenges that might need reversal
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
    if (current < m.value) {
      await reverseChallenge(userId, m.slug, challengesLost)
    }
  }
  
  // Check photo challenge if the deleted catch had a photo
  if (hadPhoto) {
    const photoCount = catchRows.filter(c => !!c.photo_url).length
    
    if ((photoCount || 0) < 10) {
      await reverseChallenge(userId, 'photo_pro', challengesLost)
    }
    if ((photoCount || 0) < 50) {
      await reverseChallenge(userId, 'photo_master', challengesLost)
    }
  }
  
  // Check location challenges
  const locationRows = catchRows.filter(c => c.latitude != null && c.longitude != null)
  const uniqueLocations = new Set(
    locationRows.map(l => `${Math.round((l.latitude as number) * 100)},${Math.round((l.longitude as number) * 100)}`)
  )
  if (uniqueLocations.size < 5) {
    await reverseChallenge(userId, 'new_waters', challengesLost)
  }
  if (uniqueLocations.size < 10) {
    await reverseChallenge(userId, 'explorer', challengesLost)
  }
  if (uniqueLocations.size < 25) {
    await reverseChallenge(userId, 'adventurer', challengesLost)
  }

  // Time-based progress challenges
  const dawnCount = catchRows.filter(c => {
    const hour = new Date(c.caught_at).getHours()
    return hour >= 4 && hour < 6
  }).length
  const earlyCount = catchRows.filter(c => {
    const hour = new Date(c.caught_at).getHours()
    return hour >= 5 && hour < 7
  }).length
  const nightCount = catchRows.filter(c => {
    const hour = new Date(c.caught_at).getHours()
    return hour >= 22 || hour < 5
  }).length
  const goldenCount = catchRows.filter(c => {
    const hour = new Date(c.caught_at).getHours()
    return hour >= 18 && hour < 20
  }).length

  if (dawnCount < 5) await reverseChallenge(userId, 'dawn_patrol', challengesLost)
  if (earlyCount < 10) await reverseChallenge(userId, 'early_bird', challengesLost)
  if (nightCount < 5) await reverseChallenge(userId, 'night_owl', challengesLost)
  if (goldenCount < 10) await reverseChallenge(userId, 'golden_hour', challengesLost)

  // Weather-based challenges
  const lowerConditions = catchRows.map(c => (c.weather_condition ?? '').toLowerCase())
  const rainCount = lowerConditions.filter(c => c.includes('rain') || c.includes('drizzle') || c.includes('shower')).length
  const sunnyCount = lowerConditions.filter(c => c.includes('clear') || c.includes('sunny')).length
  const hasStorm = lowerConditions.some(c => c.includes('thunder') || c.includes('storm'))
  const hasFog = lowerConditions.some(c => c.includes('fog') || c.includes('mist'))
  if (rainCount < 5) await reverseChallenge(userId, 'weather_warrior', challengesLost)
  if (sunnyCount < 10) await reverseChallenge(userId, 'sunny_fisher', challengesLost)
  if (!hasStorm) await reverseChallenge(userId, 'storm_chaser', challengesLost)
  if (!hasFog) await reverseChallenge(userId, 'fog_fisher', challengesLost)

  // Moon challenges
  const moonPhases = new Set(catchRows.map(c => c.moon_phase).filter(Boolean) as string[])
  if (!moonPhases.has('Full Moon')) await reverseChallenge(userId, 'full_moon_catch', challengesLost)
  if (!moonPhases.has('New Moon')) await reverseChallenge(userId, 'new_moon_catch', challengesLost)
  if (moonPhases.size < 4) await reverseChallenge(userId, 'moon_master', challengesLost)

  // Weight challenges
  const weights = catchRows.map(c => c.weight_kg ?? 0)
  const hasBigFish = weights.some(w => w >= 5)
  const hasMonsterFish = weights.some(w => w >= 10)
  if (!hasBigFish) await reverseChallenge(userId, 'big_fish', challengesLost)
  if (!hasMonsterFish) await reverseChallenge(userId, 'monster_catch', challengesLost)

  // Weekly streak challenges (by week presence)
  const weeksWithCatches = new Set<string>()
  catchRows.forEach(c => {
    const date = new Date(c.caught_at)
    const weekStart = getWeekStart(date)
    weeksWithCatches.add(weekStart.toISOString().split('T')[0])
  })
  const sortedWeeks = Array.from(weeksWithCatches).sort().reverse()
  let consecutiveWeeks = sortedWeeks.length > 0 ? 1 : 0
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
  if (consecutiveWeeks < 4) await reverseChallenge(userId, 'weekly_warrior', challengesLost)
  if (consecutiveWeeks < 8) await reverseChallenge(userId, 'dedicated_angler', challengesLost)

  // If the user has zero catches left, aggressively revoke all catch_* and country/catch travel achievements
  if (totalCatches === 0) {
    // Reverse any species-specific challenges (catch_*)
    const { data: catchChallenges } = await supabase
      .from('challenges')
      .select('slug')
      .ilike('slug', 'catch_%')

    for (const row of catchChallenges ?? []) {
      const s = (row as any).slug as string
      await reverseChallenge(userId, s, challengesLost)
    }

    // Reverse any completed country/travel challenges (we don't need to know codes in advance)
    const { data: completedGeo } = await supabase
      .from('user_challenges')
      .select('challenges!inner(slug)')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)

    const geoSlugs = new Set(
      (completedGeo ?? [])
        .map((r: any) => r.challenges?.slug)
        .filter((s: any) => typeof s === 'string')
        .filter((s: string) =>
          s.endsWith('_first_catch') ||
          s.endsWith('_explorer_10') ||
          s.endsWith('_explorer_50') ||
          s.startsWith('world_traveler_') ||
          s === 'european_tour'
        )
    )

    for (const s of geoSlugs) {
      await reverseChallenge(userId, s, challengesLost)
    }
  }
}

/**
 * Reverse a single challenge if it was completed
 */
async function reverseChallenge(userId: string, slug: string, challengesLost: string[]) {
  // Get challenge
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, xp_reward')
    .eq('slug', slug)
    .maybeSingle()
  
  if (!challenge) return
  
  // Check if it was completed
  const { data: userChallenge } = await supabase
    .from('user_challenges')
    .select('id, completed_at, xp_awarded')
    .eq('user_id', userId)
    .eq('challenge_id', challenge.id)
    .maybeSingle()
  
  if (!userChallenge?.completed_at) return // Not completed, nothing to reverse
  
  // Remove any recorded contributing catches (if table has FK it will cascade, but do it explicitly)
  await supabase
    .from('challenge_catches')
    .delete()
    .eq('user_challenge_id', userChallenge.id)

  // Delete the user_challenge record (or reset it)
  await supabase
    .from('user_challenges')
    .delete()
    .eq('id', userChallenge.id)
  
  // Reverse the challenge XP if it was awarded
  if (userChallenge.xp_awarded && userChallenge.xp_awarded > 0) {
    // Get current XP and subtract
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single()
    
    const newXP = Math.max(0, (profile?.xp || 0) - userChallenge.xp_awarded)
    
    await supabase
      .from('profiles')
      .update({ xp: newXP, level: calculateLevel(newXP) })
      .eq('id', userId)
    
    // Mark the challenge XP transaction as reversed
    await supabase
      .from('xp_transactions')
      .update({ amount: 0 })
      .eq('user_id', userId)
      .eq('reference_type', 'challenge')
      .eq('reference_id', challenge.id)
  }
  
  challengesLost.push(slug)
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

type CatchRow = {
  species: string
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  caught_at: string
  weather_condition: string | null
  moon_phase: string | null
  weight_kg: number | null
  country_code: string | null
}

export function useDeleteCatch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string): Promise<{ xpReversed: number; challengesLost: string[] }> => {
      let xpReversed = 0
      const challengesLost: string[] = []
      
      if (user) {
        // Get the catch details before deleting (for challenge reversal)
        const { data: catchData } = await supabase
          .from('catches')
          .select('species, photo_url')
          .eq('id', id)
          .single()
        
        // Find and reverse XP transaction for this catch
        const { data: transaction, error: txError } = await supabase
          .from('xp_transactions')
          .select('id, amount')
          .eq('user_id', user.id)
          .eq('reference_type', 'catch')
          .eq('reference_id', id)
          .maybeSingle()
        
        console.log('[DeleteCatch] Looking for XP transaction for catch:', id)
        console.log('[DeleteCatch] Transaction found:', transaction, 'error:', txError)
        
        if (transaction && transaction.amount > 0) {
          // Get current XP and subtract
          const { data: profile } = await supabase
            .from('profiles')
            .select('xp')
            .eq('id', user.id)
            .single()
          
          console.log('[DeleteCatch] Current profile XP:', profile?.xp)
          
          const newXP = Math.max(0, (profile?.xp || 0) - transaction.amount)
          
          console.log('[DeleteCatch] Reversing', transaction.amount, 'XP, new XP will be:', newXP)
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ xp: newXP, level: calculateLevel(newXP) })
            .eq('id', user.id)
          
          console.log('[DeleteCatch] Profile update error:', updateError)
          
          // Mark transaction as reversed
          await supabase
            .from('xp_transactions')
            .update({ amount: -transaction.amount })
            .eq('id', transaction.id)
          
          xpReversed = transaction.amount
        } else {
          console.log('[DeleteCatch] No XP transaction found to reverse')
        }
        
        // Delete the catch first
        const { error } = await supabase.from('catches').delete().eq('id', id)
        if (error) {
          throw new Error(error.message)
        }
        
        // Now check if challenges need to be reversed
        if (catchData) {
          await reverseAffectedChallenges(user.id, catchData.species, !!catchData.photo_url, challengesLost)
        }
        
        return { xpReversed, challengesLost }
      }
      
      // Delete the catch (no user logged in - shouldn't happen but handle it)
      const { error } = await supabase.from('catches').delete().eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
      
      return { xpReversed, challengesLost }
    },
    onSuccess: (data) => {
      console.log('[DeleteCatch] Invalidating all catch-related queries')
      // Invalidate ALL catches queries using predicate to match any query starting with these keys
      void queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0]
          return key === 'catches' || 
                 key === 'user-catches' ||
                 key === 'mark-catches' ||
                 key === 'lake-catches' ||
                 key === 'challenge-catches' ||
                 key === 'my-competition-catches' ||
                 key === 'sessions' ||
                 key === 'session' ||
                 key === 'my-sessions' ||
                 key === 'user-streaks'
        }
      })
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      void queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      void queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      void queryClient.invalidateQueries({ queryKey: ['user-weekly-stats'] })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      if (data.xpReversed > 0) {
        toast(`-${data.xpReversed} XP`, { icon: '↩️', duration: 2000 })
      }
      
      if (data.challengesLost.length > 0) {
        setTimeout(() => {
          toast(`Challenge${data.challengesLost.length > 1 ? 's' : ''} lost`, { icon: '🔓', duration: 3000 })
        }, 500)
      }
    },
  })
}
