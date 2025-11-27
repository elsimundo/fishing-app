import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session, SessionFormData } from '../types'

type UpdatePayload = Partial<SessionFormData> & { id: string }

async function updateSession(payload: UpdatePayload): Promise<Session> {
  const { id, ...changes } = payload

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (changes.title !== undefined) update.title = changes.title
  if (changes.location_name !== undefined) update.location_name = changes.location_name
  if (changes.latitude !== undefined) update.latitude = changes.latitude
  if (changes.longitude !== undefined) update.longitude = changes.longitude
  if (changes.water_type !== undefined) update.water_type = changes.water_type
  if (changes.is_public !== undefined) update.is_public = changes.is_public
  if (changes.location_privacy !== undefined) update.location_privacy = changes.location_privacy
  if (changes.started_at !== undefined) update.started_at = changes.started_at
  if (changes.ended_at !== undefined) update.ended_at = changes.ended_at
  if (changes.session_notes !== undefined) update.session_notes = changes.session_notes
  if (changes.cover_photo_url !== undefined) update.cover_photo_url = changes.cover_photo_url
  if (changes.tide_state !== undefined) update.tide_state = changes.tide_state

  const { data, error } = await supabase
    .from('sessions')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update session')
  }

  return data as Session
}

export function useUpdateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSession,
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['session', session.id] })
      void queryClient.invalidateQueries({ queryKey: ['sessions', 'active'] })
    },
  })
}
