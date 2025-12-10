import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Users, Store, TrendingUp, Clock, AlertCircle, EyeOff, Eye, MapPin, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'

export default function AdminDashboardPage() {
  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersRes, businessesRes, pendingRes, premiumRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('is_premium', true),
      ])

      return {
        totalUsers: usersRes.count || 0,
        totalBusinesses: businessesRes.count || 0,
        pendingBusinesses: pendingRes.count || 0,
        premiumBusinesses: premiumRes.count || 0,
      }
    },
  })

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900 lg:text-3xl">Dashboard</h1>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats?.totalUsers || 0}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            icon={Store}
            label="Businesses"
            value={stats?.totalBusinesses || 0}
            color="green"
            loading={isLoading}
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={stats?.pendingBusinesses || 0}
            color="yellow"
            loading={isLoading}
          />
          <StatCard
            icon={TrendingUp}
            label="Premium"
            value={stats?.premiumBusinesses || 0}
            color="purple"
            loading={isLoading}
          />
        </div>

        {/* Hidden Lakes */}
        <HiddenLakesSection />

        {/* Recent Activity */}
        <RecentActivitySection />

        {/* Quick Actions */}
        <QuickActionsSection />
      </div>
    </AdminLayout>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: 'blue' | 'green' | 'yellow' | 'purple'
  loading?: boolean
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
      <div className="mb-3 flex items-center justify-between lg:mb-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full lg:h-12 lg:w-12 ${colors[color]}`}
        >
          <Icon size={20} className="lg:hidden" />
          <Icon size={24} className="hidden lg:block" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 lg:text-3xl">{value}</p>
      )}
      <p className="mt-1 text-xs text-gray-600 lg:text-sm">{label}</p>
    </div>
  )
}

function RecentActivitySection() {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_activity_log')
        .select(
          `
          *,
          admin:profiles!admin_activity_log_admin_id_fkey(username)
        `
        )
        .order('created_at', { ascending: false })
        .limit(10)

      return data || []
    },
  })

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900 lg:text-xl">Recent Activity</h2>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : activity && activity.length > 0 ? (
        <div className="space-y-3">
          {activity.map((log: any) => (
            <div
              key={log.id}
              className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{formatAction(log.action)}</p>
                <p className="text-xs text-gray-600">by @{log.admin?.username || 'unknown'}</p>
              </div>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <AlertCircle size={16} />
          <span>No activity yet. Actions will appear here.</span>
        </div>
      )}
    </div>
  )
}

function HiddenLakesSection() {
  const queryClient = useQueryClient()
  
  const { data: hiddenLakes, isLoading } = useQuery({
    queryKey: ['admin-hidden-lakes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lakes')
        .select('id, name, region, hidden_at, hidden_by, profiles:hidden_by(username)')
        .eq('is_hidden', true)
        .order('hidden_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  })

  const unhideMutation = useMutation({
    mutationFn: async (lakeId: string) => {
      const { error } = await supabase
        .from('lakes')
        .update({ is_hidden: false, hidden_at: null, hidden_by: null })
        .eq('id', lakeId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hidden-lakes'] })
      queryClient.invalidateQueries({ queryKey: ['lakes'] })
      toast.success('Lake is now visible on Explore')
    },
    onError: () => {
      toast.error('Failed to unhide lake')
    },
  })

  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <EyeOff size={20} className="text-red-500" />
        <h2 className="text-lg font-bold text-gray-900 lg:text-xl">Hidden Lakes</h2>
        {hiddenLakes && hiddenLakes.length > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            {hiddenLakes.length}
          </span>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : hiddenLakes && hiddenLakes.length > 0 ? (
        <div className="space-y-2">
          {hiddenLakes.map((lake: any) => (
            <div
              key={lake.id}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{lake.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {lake.region && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {lake.region}
                    </span>
                  )}
                  {lake.hidden_at && (
                    <span>
                      Hidden {formatDistanceToNow(new Date(lake.hidden_at), { addSuffix: true })}
                      {lake.profiles?.username && ` by @${lake.profiles.username}`}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => unhideMutation.mutate(lake.id)}
                disabled={unhideMutation.isPending}
                className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-50"
              >
                <Eye size={12} />
                Show on map
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <Eye size={16} className="text-green-500" />
          <span>All lakes are visible. Hidden lakes will appear here.</span>
        </div>
      )}
    </div>
  )
}

function QuickActionsSection() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900 lg:text-xl">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickActionButton
          href="/admin/businesses?filter=pending"
          label="Review Pending"
          icon={Clock}
          color="yellow"
        />
        <QuickActionButton
          href="/admin/users"
          label="Manage Users"
          icon={Users}
          color="blue"
        />
        <QuickActionButton
          href="/admin/businesses?filter=premium"
          label="Premium Listings"
          icon={TrendingUp}
          color="purple"
        />
        <QuickActionButton
          href="/admin/businesses"
          label="All Businesses"
          icon={Store}
          color="green"
        />
      </div>
    </div>
  )
}

function QuickActionButton({
  href,
  label,
  icon: Icon,
  color,
}: {
  href: string
  label: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
  }

  return (
    <a
      href={href}
      className={`flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-colors ${colors[color]}`}
    >
      <Icon size={24} />
      <span className="text-xs font-semibold lg:text-sm">{label}</span>
    </a>
  )
}
