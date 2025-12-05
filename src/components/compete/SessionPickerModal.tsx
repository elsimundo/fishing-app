import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useSubmitEntry } from '../../hooks/useCompetitionEntries'
import type { Competition, Session } from '../../types'

interface SessionPickerModalProps {
  competition: Competition
  onClose: () => void
}

export function SessionPickerModal({ competition, onClose }: SessionPickerModalProps) {
  const { user } = useAuth()
  const submitEntry = useSubmitEntry()
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ['eligible-sessions', competition.id, user?.id],
    queryFn: async () => {
      if (!user) return []

      let query = supabase
        .from('sessions')
        .select('*')
        .gte('started_at', competition.starts_at)
        .lte('started_at', competition.ends_at)
        .order('started_at', { ascending: false })

      if (competition.water_type && competition.water_type !== 'any') {
        query = query.eq('water_type', competition.water_type)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as Session[]
    },
    enabled: Boolean(user?.id && competition.id),
  })

  const handleSubmit = async () => {
    if (!selectedSessionId) return

    try {
      await submitEntry.mutateAsync({
        competitionId: competition.id,
        sessionId: selectedSessionId,
      })
      onClose()
    } catch {
      // errors handled in hook callers
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-xl font-bold text-gray-900">Choose your session</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-base font-semibold text-gray-600 hover:bg-gray-100 active:bg-gray-200 min-h-[48px]"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-navy-800 border-t-transparent" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl">📝</div>
              <p className="mb-2 text-lg font-bold text-gray-900">No eligible sessions</p>
              <p className="text-base text-gray-600">
                You don&apos;t have any sessions that fall within this competition&apos;s dates.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.98] min-h-[80px] ${
                    selectedSessionId === session.id
                      ? 'border-navy-800 bg-navy-50'
                      : 'border-gray-200 hover:border-gray-300 active:bg-gray-50'
                  }`}
                >
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-emerald-500 text-2xl text-white">
                    🎣
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-gray-900">
                      {session.title || 'Untitled session'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(session.started_at).toLocaleDateString()} · {session.location_name}
                    </p>
                  </div>
                  {selectedSessionId === session.id && (
                    <div className="flex-shrink-0 text-2xl">✓</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {sessions && sessions.length > 0 && (
          <div className="flex gap-3 border-t border-gray-200 px-5 py-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-gray-300 px-4 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] min-h-[56px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedSessionId || submitEntry.isPending}
              className="flex-1 rounded-xl bg-navy-800 px-4 py-4 text-base font-semibold text-white transition-all hover:bg-navy-900 active:scale-[0.98] disabled:bg-navy-400 min-h-[56px]"
            >
              {submitEntry.isPending ? 'Submitting…' : '🏆 Submit entry'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
