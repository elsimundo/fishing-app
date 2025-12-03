import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { UserCard } from './UserCard'

export function PopularAnglers() {
  const { user } = useAuth()

  const { data: users, isLoading } = useQuery({
    queryKey: ['popularAnglers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `*,
          followers:follows!follows_following_id_fkey(count)
        `,
        )
        .neq('id', user?.id ?? '')
        // Order by the follower COUNT on the followers relation
        .order('count', { foreignTable: 'followers', ascending: false })
        .limit(10)

      if (error) throw error
      return data ?? []
    },
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
    <div className="bg-white px-5 py-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Popular Anglers</h2>
      <div className="space-y-3">
        {users.map((u: any) => (
          <UserCard key={u.id} user={u} />
        ))}
      </div>
    </div>
  )
}
