import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Users, Store, TrendingUp, Clock, AlertCircle, EyeOff, Eye, MapPin, Loader2, Activity, DollarSign } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useApiUsageSummary, API_COST_ESTIMATES } from '../../hooks/useApiUsage'

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

        {/* API Usage Tracking */}
        <ApiUsageSection />

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
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
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
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-200">
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
                className="flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/40 disabled:opacity-50"
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

function ApiUsageSection() {
  const { data: apiUsage, isLoading } = useApiUsageSummary(30)

  // Calculate estimated monthly cost
  const estimatedMonthlyCost = apiUsage?.reduce((total, api) => {
    const costInfo = API_COST_ESTIMATES[api.api_name] || API_COST_ESTIMATES.other
    return total + (api.calls_this_month * costInfo.perCall)
  }, 0) || 0

  const formatApiName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-4 shadow-sm lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-blue-500" />
          <h2 className="text-lg font-bold text-foreground lg:text-xl">API Usage</h2>
        </div>
        {estimatedMonthlyCost > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            <DollarSign size={12} />
            ~${estimatedMonthlyCost.toFixed(2)}/mo
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : apiUsage && apiUsage.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">API</th>
                <th className="pb-2 text-right font-medium">Today</th>
                <th className="pb-2 text-right font-medium">7 Days</th>
                <th className="pb-2 text-right font-medium">30 Days</th>
                <th className="pb-2 text-right font-medium">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {apiUsage.map((api) => {
                const costInfo = API_COST_ESTIMATES[api.api_name] || API_COST_ESTIMATES.other
                const monthlyCost = api.calls_this_month * costInfo.perCall
                return (
                  <tr key={api.api_name} className="border-b border-border last:border-0">
                    <td className="py-2">
                      <span className="font-medium text-foreground">{formatApiName(api.api_name)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{costInfo.notes}</span>
                    </td>
                    <td className="py-2 text-right font-mono text-foreground">{api.calls_today.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-foreground">{api.calls_this_week.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-foreground">{api.calls_this_month.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-foreground">
                      {monthlyCost > 0 ? `$${monthlyCost.toFixed(2)}` : 'Free'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <AlertCircle size={16} />
          <span>No API calls tracked yet. Usage will appear here once tracking is integrated.</span>
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
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/30',
    green: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30',
    yellow: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30',
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-200 dark:hover:bg-purple-900/30',
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
