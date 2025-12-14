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
  // First check if profile already exists
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (fetchError) {
    console.error('[ensureProfile] Error checking existing profile:', fetchError)
    // Don't throw on fetch error - profile might exist but RLS is blocking read
  }

  if (existing) {
    return
  }

  // Try to insert the profile
  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    username: username ?? null,
    email: email ?? null,
  })

  if (insertError) {
    // If it's a duplicate key error, the profile was created by the trigger - that's fine
    if (insertError.code === '23505') {
      return
    }
    
    console.error('[ensureProfile] Error inserting profile:', insertError)
    throw insertError
  }
  
}
