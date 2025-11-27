import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session, SessionFormData } from '../types'

async function createSession(payload: SessionFormData): Promise<Session> {
  const userRes = await supabase.auth.getUser()
  const userId = userRes.data.user?.id

  if (!userId) {
    throw new Error('Not authenticated')
  }

  const insertPayload = {
    user_id: userId,
    title: payload.title ?? null,
    location_name: payload.location_name,
    latitude: payload.latitude,
    longitude: payload.longitude,
    water_type: payload.water_type ?? null,
    is_public: payload.is_public,
    location_privacy: payload.location_privacy,
    started_at: payload.started_at,
    ended_at: payload.ended_at ?? null,
    session_notes: payload.session_notes ?? null,
    cover_photo_url: payload.cover_photo_url ?? null,
    tide_state: payload.tide_state ?? null,
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create session')
  }

  return data as Session
}

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
