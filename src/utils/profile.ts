import { supabase } from '../lib/supabase'

export async function ensureProfile({
  userId,
  username,
  email,
}: {
  userId: string
  username?: string | null
  email?: string | null
}) {
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (fetchError) {
    throw fetchError
  }

  if (existing) return

  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    username: username ?? null,
    email: email ?? null,
  })

  if (insertError) {
    throw insertError
  }
}
