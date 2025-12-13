import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { UserCard } from './UserCard'

interface UserSearchResultsProps {
  query: string
}

export function UserSearchResults({ query }: UserSearchResultsProps) {
  const { user } = useAuth()

  const { data: users, isLoading } = useQuery({
    queryKey: ['searchUsers', query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(50)

      if (error) throw error
      return data ?? []
    },
    enabled: query.trim().length > 0,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1BA9A0]" />
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <div className="mb-3 text-5xl">🔍</div>
        <p className="mb-1 text-base font-semibold text-white">No anglers found</p>
        <p className="text-sm text-gray-400">Try searching for a different username</p>
      </div>
    )
  }

  return (
    <div className="px-5 py-6">
      <p className="mb-4 text-sm text-gray-400">{users.length} anglers found</p>
      <div className="space-y-3">
        {users.map((u: any) => (
          <UserCard key={u.id} user={u} />
        ))}
      </div>
    </div>
  )
}
