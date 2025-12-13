import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Search, Ban, UserCheck, Shield, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

type UserRole = 'user' | 'moderator' | 'admin' | 'owner'
type UserStatus = 'active' | 'suspended' | 'banned'

interface Profile {
  id: string
  username: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: UserRole
  status: UserStatus
  created_at: string
  banned_reason: string | null
}

export default function UsersPage() {
  const { user } = useAdminAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchTerm, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      }

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      return data as Profile[]
    },
  })

  // Ban user mutation
  const banUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc('ban_user', {
        p_user_id: userId,
        p_admin_id: user?.id,
        p_reason: reason,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('User banned')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Unban user mutation
  const unbanUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('unban_user', {
        p_user_id: userId,
        p_admin_id: user?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('User unbanned')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Set role mutation
  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Role updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Users</h1>

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              className="rounded-lg border-2 border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="moderator">Moderators</option>
              <option value="admin">Admins</option>
              <option value="owner">Owners</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={20}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="w-full rounded-lg border-2 border-border bg-background text-foreground py-2 pl-10 pr-4 text-sm focus:border-navy-800 focus:outline-none sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-3">
            {users.map((profile) => (
              <UserCard
                key={profile.id}
                profile={profile}
                currentUserId={user?.id}
                onBan={(reason) => banUser.mutate({ userId: profile.id, reason })}
                onUnban={() => unbanUser.mutate(profile.id)}
                onSetRole={(role) => setRole.mutate({ userId: profile.id, role })}
                isBanning={banUser.isPending}
                isUnbanning={unbanUser.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-muted p-6 text-muted-foreground">
            <AlertCircle size={20} />
            <span>No users found</span>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function UserCard({
  profile,
  currentUserId,
  onBan,
  onUnban,
  onSetRole,
  isBanning,
  isUnbanning,
}: {
  profile: Profile
  currentUserId?: string
  onBan: (reason: string) => void
  onUnban: () => void
  onSetRole: (role: UserRole) => void
  isBanning: boolean
  isUnbanning: boolean
}) {
  const [showActions, setShowActions] = useState(false)
  const isCurrentUser = profile.id === currentUserId
  const canModify = !isCurrentUser && profile.role !== 'owner'

  const roleColors: Record<UserRole, string> = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    moderator: 'bg-green-100 text-green-800',
    user: 'bg-muted text-muted-foreground',
  }

  const statusColors: Record<UserStatus, string> = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-yellow-100 text-yellow-800',
    banned: 'bg-red-100 text-red-800',
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 font-bold text-white">
              {profile.username?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">@{profile.username}</p>
              {isCurrentUser && (
                <span className="text-xs text-muted-foreground">(you)</span>
              )}
            </div>
            {profile.full_name && (
              <p className="text-sm text-muted-foreground">{profile.full_name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${roleColors[profile.role]}`}
            >
              {profile.role}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColors[profile.status]}`}
            >
              {profile.status}
            </span>
          </div>

          {canModify && (
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-xs font-semibold text-navy-800 hover:underline"
            >
              {showActions ? 'Hide Actions' : 'Actions'}
            </button>
          )}
        </div>
      </div>

      {/* Banned Reason */}
      {profile.status === 'banned' && profile.banned_reason && (
        <div className="mt-3 rounded-lg bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-800">Ban Reason:</p>
          <p className="text-sm text-red-700">{profile.banned_reason}</p>
        </div>
      )}

      {/* Actions Panel */}
      {showActions && canModify && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {profile.status === 'banned' ? (
            <button
              onClick={() => onUnban()}
              disabled={isUnbanning}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <UserCheck size={14} />
              <span>{isUnbanning ? 'Unbanning...' : 'Unban'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                const reason = prompt('Reason for ban:')
                if (reason) onBan(reason)
              }}
              disabled={isBanning}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Ban size={14} />
              <span>{isBanning ? 'Banning...' : 'Ban'}</span>
            </button>
          )}

          {/* Role Selector */}
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-muted-foreground" />
            <select
              value={profile.role}
              onChange={(e) => onSetRole(e.target.value as UserRole)}
              className="rounded-lg border border-border bg-background text-foreground px-2 py-1.5 text-sm"
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
