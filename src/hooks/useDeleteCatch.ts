import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

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
  return 10 + Math.floor((xp - 5500) / 1000)
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
  // Get updated counts AFTER the catch was deleted
  const { count: totalCatches } = await supabase
    .from('catches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  
  const { data: speciesData } = await supabase
    .from('catches')
    .select('species')
    .eq('user_id', userId)
  
  const uniqueSpecies = new Set(speciesData?.map(c => c.species.toLowerCase()) || [])
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
    const { count: photoCount } = await supabase
      .from('catches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('photo_url', 'is', null)
    
    if ((photoCount || 0) < 10) {
      await reverseChallenge(userId, 'photo_pro', challengesLost)
    }
    if ((photoCount || 0) < 50) {
      await reverseChallenge(userId, 'photo_master', challengesLost)
    }
  }
  
  // Check location challenges
  const { data: locations } = await supabase
    .from('catches')
    .select('latitude, longitude')
    .eq('user_id', userId)
    .not('latitude', 'is', null)
  
  if (locations) {
    const uniqueLocations = new Set(
      locations.map(l => `${Math.round(l.latitude * 100)},${Math.round(l.longitude * 100)}`)
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
        const { data: transaction } = await supabase
          .from('xp_transactions')
          .select('id, amount')
          .eq('user_id', user.id)
          .eq('reference_type', 'catch')
          .eq('reference_id', id)
          .maybeSingle()
        
        if (transaction && transaction.amount > 0) {
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
          
          // Mark transaction as reversed
          await supabase
            .from('xp_transactions')
            .update({ amount: -transaction.amount })
            .eq('id', transaction.id)
          
          xpReversed = transaction.amount
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
      void queryClient.invalidateQueries({ queryKey: ['catches'] })
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      void queryClient.invalidateQueries({ queryKey: ['user-xp'] })
      void queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      
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
