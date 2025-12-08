import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Lake, Catch } from '../types'
import { Layout } from '../components/layout/Layout'
import { 
  ArrowLeft, 
  BarChart3, 
  Fish, 
  Calendar, 
  TrendingUp, 
  Users, 
  Eye,
  Crown,
  Lock
} from 'lucide-react'
import { UpgradeToPremiumCard } from '../components/lakes/UpgradeToPremiumCard'

export default function LakeOwnerDashboard() {
  const { lakeId } = useParams<{ lakeId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Fetch lake details
  const { data: lake, isLoading: lakeLoading } = useQuery({
    queryKey: ['lake-owner-dashboard', lakeId],
    queryFn: async () => {
      if (!lakeId) return null
      const { data, error } = await supabase
        .from('lakes')
        .select('*')
        .eq('id', lakeId)
        .single()
      if (error) throw error
      return data as Lake
    },
    enabled: !!lakeId,
  })

  // Check if user is the owner
  const isOwner = lake?.claimed_by === user?.id
  const isPremium = lake?.is_premium

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['lake-analytics', lakeId],
    queryFn: async () => {
      if (!lakeId) return null

      // Get sessions at this lake
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, user_id, started_at, ended_at')
        .eq('lake_id', lakeId)

      const sessionIds = sessions?.map((s) => s.id) || []
      const uniqueAnglers = new Set(sessions?.map((s) => s.user_id) || []).size

      // Get catches from those sessions
      let catches: Catch[] = []
      if (sessionIds.length > 0) {
        const { data: catchData } = await supabase
          .from('catches')
          .select('id, species, weight_kg, caught_at')
          .in('session_id', sessionIds)
        catches = (catchData || []) as Catch[]
      }

      // Species breakdown
      const speciesCount: Record<string, number> = {}
      catches.forEach((c) => {
        speciesCount[c.species] = (speciesCount[c.species] || 0) + 1
      })
      const topSpecies = Object.entries(speciesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

      // Monthly sessions (last 6 months)
      const now = new Date()
      const monthlyData: { month: string; sessions: number; catches: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = date.toISOString().slice(0, 7)
        const monthLabel = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        
        const monthSessions = sessions?.filter((s) => s.started_at.startsWith(monthKey)).length || 0
        const monthCatches = catches.filter((c) => c.caught_at.startsWith(monthKey)).length
        
        monthlyData.push({ month: monthLabel, sessions: monthSessions, catches: monthCatches })
      }

      // Best day of week
      const dayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
      sessions?.forEach((s) => {
        const day = new Date(s.started_at).getDay()
        dayCount[day]++
      })
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]

      return {
        totalSessions: sessions?.length || 0,
        totalCatches: catches.length,
        uniqueAnglers,
        topSpecies,
        monthlyData,
        bestDay: bestDay ? { name: dayNames[parseInt(bestDay[0])], count: bestDay[1] } : null,
        avgCatchesPerSession: sessions?.length ? (catches.length / sessions.length).toFixed(1) : '0',
      }
    },
    enabled: !!lakeId && isOwner,
  })

  const isLoading = lakeLoading || analyticsLoading

  // Not owner - show access denied
  if (!isLoading && lake && !isOwner) {
    return (
      <Layout>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Lock size={48} className="mx-auto text-gray-300" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-sm text-gray-500">
              Only the verified owner of this venue can access the dashboard.
            </p>
            <Link
              to={`/lakes/${lakeId}`}
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              View Lake Page
            </Link>
          </div>
        </main>
      </Layout>
    )
  }

  return (
    <Layout>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col pb-24 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {isLoading && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Loading dashboard...</p>
          </div>
        )}

        {!isLoading && lake && analytics && (
          <div className="space-y-4">
            {/* Header */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 size={20} className="text-primary" />
                    <h1 className="text-xl font-bold text-gray-900">Owner Dashboard</h1>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{lake.name}</p>
                </div>
                {isPremium ? (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    <Crown size={14} /> Premium
                  </span>
                ) : (
                  <Link
                    to="/premium" // TODO: link to upgrade page
                    className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90"
                  >
                    <Crown size={14} /> Upgrade to Premium
                  </Link>
                )}
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                icon={<Calendar size={20} />}
                label="Total Sessions"
                value={analytics.totalSessions}
                color="blue"
              />
              <StatCard
                icon={<Fish size={20} />}
                label="Total Catches"
                value={analytics.totalCatches}
                color="emerald"
              />
              <StatCard
                icon={<Users size={20} />}
                label="Unique Anglers"
                value={analytics.uniqueAnglers}
                color="purple"
              />
              <StatCard
                icon={<TrendingUp size={20} />}
                label="Avg Catches/Session"
                value={analytics.avgCatchesPerSession}
                color="amber"
              />
            </div>

            {/* Premium-only: Monthly trend */}
            {isPremium ? (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-gray-900">Activity Trend (6 months)</h2>
                <div className="flex items-end gap-2 h-32">
                  {analytics.monthlyData.map((m) => {
                    const maxVal = Math.max(...analytics.monthlyData.map((d) => d.sessions + d.catches), 1)
                    const height = ((m.sessions + m.catches) / maxVal) * 100
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full rounded-t bg-primary/80"
                          style={{ height: `${height}%`, minHeight: m.sessions + m.catches > 0 ? '4px' : '0' }}
                        />
                        <p className="mt-2 text-[10px] text-gray-500">{m.month}</p>
                        <p className="text-[10px] font-medium text-gray-700">{m.sessions + m.catches}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center gap-3">
                  <Lock size={24} className="text-gray-400" />
                  <div>
                    <h2 className="text-sm font-semibold text-gray-700">Activity Trend</h2>
                    <p className="text-xs text-gray-500">Upgrade to Premium to see monthly trends</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Species */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Top Species Caught</h2>
              {analytics.topSpecies.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topSpecies.map(([species, count], i) => (
                    <div key={species} className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-bold text-gray-400">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{species}</span>
                          <span className="text-xs text-gray-500">{count} catches</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${(count / analytics.topSpecies[0][1]) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No catches recorded yet.</p>
              )}
            </div>

            {/* Best Day */}
            {analytics.bestDay && analytics.bestDay.count > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-gray-900">Busiest Day</h2>
                <p className="text-2xl font-bold text-primary">{analytics.bestDay.name}</p>
                <p className="text-xs text-gray-500">{analytics.bestDay.count} sessions</p>
              </div>
            )}

            {/* Premium-only: Profile views placeholder */}
            {isPremium ? (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Eye size={20} className="text-gray-400" />
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Profile Views</h2>
                    <p className="text-xs text-gray-500">Coming soon - track how many anglers view your venue</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Upgrade to Premium Card */}
            <UpgradeToPremiumCard
              lakeId={lake.id}
              lakeName={lake.name}
              isPremium={isPremium || false}
              premiumExpiresAt={(lake as { premium_expires_at?: string }).premium_expires_at}
            />
          </div>
        )}
      </main>
    </Layout>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: 'blue' | 'emerald' | 'purple' | 'amber'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className={`inline-flex rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
