import { useAuth } from './useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['admin-check', user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'
  const isOwner = profile?.role === 'owner'
  const isModerator = profile?.role === 'moderator' || isAdmin
  const isLoading = authLoading || profileLoading

  return {
    user,
    isAdmin,
    isOwner,
    isModerator,
    isLoading,
    role: profile?.role || 'user',
    status: profile?.status || 'active',
  }
}
