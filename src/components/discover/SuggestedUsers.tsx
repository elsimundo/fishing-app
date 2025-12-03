import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { UserCard } from './UserCard'

export function SuggestedUsers() {
  const { user } = useAuth()

  const { data: users, isLoading } = useQuery({
    queryKey: ['suggestedUsers', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = (following ?? []).map((f: any) => f.following_id)

      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(10)

      if (followingIds.length > 0) {
        query = query.not('id', 'in', `(${followingIds.join(',')})`)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-navy-800" />
      </div>
    )
  }

  if (!users || users.length === 0) return null

  return (
    <div className="border-b border-gray-200 bg-white px-5 py-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Suggested for you</h2>
      <div className="space-y-3">
        {users.map((u: any) => (
          <UserCard key={u.id} user={u} />
        ))}
      </div>
    </div>
  )
}
