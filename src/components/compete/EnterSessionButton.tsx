import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useCompetition } from '../../hooks/useCompetitions'
import { useAuth } from '../../hooks/useAuth'

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
      queryClient.invalidateQueries({ queryKey: ['session_participants', competition?.session_id] })
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
