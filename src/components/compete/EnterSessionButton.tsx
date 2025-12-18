import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useCompetition } from '../../hooks/useCompetitions'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'react-hot-toast'

interface EnterSessionButtonProps {
  competitionId: string
}

export function EnterSessionButton({ competitionId }: EnterSessionButtonProps) {
  const { data: competition } = useCompetition(competitionId)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const joinCompetition = useMutation({
    mutationFn: async () => {
      if (!competition?.session_id || !user?.id) {
        throw new Error('Missing competition session or user')
      }

      // Add user as a participant to the competition's session
      const { error } = await supabase.from('session_participants').insert({
        session_id: competition.session_id,
        user_id: user.id,
        role: 'contributor',
        status: 'active',
      })

      if (error) throw error
      
      // Check competition entry challenges
      await checkCompetitionEntryChallenges(user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] })
      queryClient.invalidateQueries({ queryKey: ['session_participants', competition?.session_id] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      toast.success('Joined competition!')
    },
  })

  const handleJoin = async () => {
    if (!competition?.session_id) {
      alert('This competition does not have an active session.')
      return
    }

    try {
      await joinCompetition.mutateAsync()
    } catch (error: any) {
      console.error('Failed to join competition:', error)
      if (error.code === '23505') {
        alert('You have already joined this competition.')
      } else {
        alert('Failed to join competition. Please try again.')
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={joinCompetition.isPending}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-4 text-sm font-semibold text-white transition-colors hover:bg-navy-900 disabled:bg-navy-400"
    >
      {joinCompetition.isPending ? 'Joining...' : 'Join Competition'}
    </button>
  )
}

/**
 * Check and complete competition entry challenges
 * Counts competitions joined via session_participants (not legacy competition_entries)
 */
async function checkCompetitionEntryChallenges(userId: string) {
  // Count competitions user has joined (sessions with competition_id where user is participant)
  const { data: participations } = await supabase
    .from('session_participants')
    .select(`
      session_id,
      sessions!inner(competition_id)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .not('sessions.competition_id', 'is', null)
  
  const competitionCount = participations?.length || 0
  
  const milestones = [
    { slug: 'comp_entered', value: 1 },
    { slug: 'comp_5_entered', value: 5 },
  ]
  
  for (const m of milestones) {
    if (competitionCount >= m.value) {
      // Get challenge
      const { data: challenge } = await supabase
        .from('challenges')
        .select('id, xp_reward')
        .eq('slug', m.slug)
        .maybeSingle()
      
      if (!challenge) continue
      
      // Check if already completed
      const { data: existing } = await supabase
        .from('user_challenges')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('challenge_id', challenge.id)
        .maybeSingle()
      
      if (existing?.completed_at) continue
      
      // Complete the challenge
      await supabase
        .from('user_challenges')
        .upsert({
          user_id: userId,
          challenge_id: challenge.id,
          progress: competitionCount,
          target: m.value,
          completed_at: new Date().toISOString(),
          xp_awarded: challenge.xp_reward,
        }, { onConflict: 'user_id,challenge_id' })
      
      // Award XP
      await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_amount: challenge.xp_reward,
        p_reason: 'challenge_completed',
        p_reference_type: 'challenge',
        p_reference_id: challenge.id,
      })
    }
  }
}
