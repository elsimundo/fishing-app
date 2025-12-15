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
        <h1 className="mb-8 text-2xl font-bold text-foreground lg:text-3xl">Dashboard</h1>

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
    blue: 'bg-[#DBEAFE] text-[#2563EB]',
    green: 'bg-[#DCFCE7] text-[#16A34A]',
    yellow: 'bg-[#FEF9C3] text-[#CA8A04]',
    purple: 'bg-[#F3E8FF] text-[#7C3AED]',
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:p-6">
      <div className="mb-3 flex items-center justify-between lg:mb-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full lg:h-12 lg:w-12 ${colors[color]}`}
        >
          <Icon size={20} className="lg:hidden" />
          <Icon size={24} className="hidden lg:block" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <p className="text-2xl font-bold text-foreground lg:text-3xl">{value}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground lg:text-sm">{label}</p>
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
    <div className="mb-8 rounded-xl border border-border bg-card p-4 shadow-sm lg:p-6">
      <h2 className="mb-4 text-lg font-bold text-foreground lg:text-xl">Recent Activity</h2>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : activity && activity.length > 0 ? (
        <div className="space-y-3">
          {activity.map((log: any) => (
            <div
              key={log.id}
              className="flex items-center justify-between border-b border-border py-2 last:border-0"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{formatAction(log.action)}</p>
                <p className="text-xs text-muted-foreground">by @{log.admin?.username || 'unknown'}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
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
    <div className="mb-8 rounded-xl border border-border bg-card p-4 shadow-sm lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <EyeOff size={20} className="text-red-500" />
        <h2 className="text-lg font-bold text-foreground lg:text-xl">Hidden Lakes</h2>
        {hiddenLakes && hiddenLakes.length > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            {hiddenLakes.length}
          </span>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : hiddenLakes && hiddenLakes.length > 0 ? (
        <div className="space-y-2">
          {hiddenLakes.map((lake: any) => (
            <div
              key={lake.id}
              className="flex items-center justify-between rounded-lg bg-muted p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{lake.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        <div className="flex items-center gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <Eye size={16} className="text-green-500" />
          <span>All lakes are visible. Hidden lakes will appear here.</span>
        </div>
      )}
    </div>
  )
}

function QuickActionsSection() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:p-6">
      <h2 className="mb-4 text-lg font-bold text-foreground lg:text-xl">Quick Actions</h2>
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
    blue: 'bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]',
    green: 'bg-[#F0FDF4] text-[#15803D] hover:bg-[#DCFCE7]',
    yellow: 'bg-[#FFFBEB] text-[#B45309] hover:bg-[#FEF3C7]',
    purple: 'bg-[#FAF5FF] text-[#6D28D9] hover:bg-[#F3E8FF]',
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
