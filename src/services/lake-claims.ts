import { supabase } from '../lib/supabase'

export async function createLakeClaim(lakeId: string, userId: string, message: string | null) {
  const { error } = await supabase.from('lake_claims').insert({
    lake_id: lakeId,
    user_id: userId,
    message: message || null,
  })

  if (error) {
    throw new Error(error.message)
  }
}
