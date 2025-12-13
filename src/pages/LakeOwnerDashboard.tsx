import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
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
  Lock,
  UserPlus,
  Shield,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { UpgradeToPremiumCard } from '../components/lakes/UpgradeToPremiumCard'
import { useLakeRole, useLakeTeam, useAddLakeTeamMember, useRemoveLakeTeamMember, useUpdateLakeTeamRole } from '../hooks/useLakeTeam'
import { toast } from 'react-hot-toast'

export default function LakeOwnerDashboard() {
  const { lakeId } = useParams<{ lakeId: string }>()
  const navigate = useNavigate()
  const [showTeamSection, setShowTeamSection] = useState(false)

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

  // Get user's role for this lake (owner, manager, bailiff, or null)
  const { data: userRole, isLoading: roleLoading } = useLakeRole(lakeId)
  
  // Get team members
  const { data: teamData } = useLakeTeam(lakeId)

  // Check permissions based on role
  const hasAccess = userRole === 'owner' || userRole === 'manager' || userRole === 'bailiff'
  const canEdit = userRole === 'owner' || userRole === 'manager'
  const isOwner = userRole === 'owner'
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
    enabled: !!lakeId && hasAccess,
  })

  const isLoading = lakeLoading || analyticsLoading || roleLoading

  // No access - show access denied
  if (!isLoading && lake && !hasAccess) {
    return (
      <Layout>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Lock size={48} className="mx-auto text-gray-300" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-sm text-gray-500">
              Only the owner and team members can access this dashboard.
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

            {/* Team Management - Owner & Manager only */}
            {canEdit && (
              <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTeamSection(!showTeamSection)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">Team Management</h2>
                      <p className="text-xs text-gray-500">
                        {teamData?.team.length || 0} team member{(teamData?.team.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {showTeamSection ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>

                {showTeamSection && (
                  <div className="border-t border-gray-100 p-5 space-y-4">
                    {/* Owner */}
                    {teamData?.owner && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50">
                        <div className="h-10 w-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                          {teamData.owner.display_name?.[0] || teamData.owner.username?.[0] || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {teamData.owner.display_name || teamData.owner.username || 'Unknown'}
                          </p>
                          <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                            <Crown size={12} /> Owner
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Team members */}
                    {teamData?.team.map((member) => (
                      <TeamMemberRow
                        key={member.id}
                        member={member}
                        lakeId={lakeId!}
                        isOwner={isOwner}
                      />
                    ))}

                    {/* Add team member */}
                    {isOwner && (
                      <AddTeamMemberForm lakeId={lakeId!} />
                    )}

                    {!isOwner && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        Only the owner can add or remove team members.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

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

// Team member row component
function TeamMemberRow({
  member,
  lakeId,
  isOwner,
}: {
  member: {
    id: string
    role: 'manager' | 'bailiff'
    profile?: {
      display_name: string | null
      username: string | null
    }
  }
  lakeId: string
  isOwner: boolean
}) {
  const { mutate: removeMember, isPending: isRemoving } = useRemoveLakeTeamMember()
  const { mutate: updateRole, isPending: isUpdating } = useUpdateLakeTeamRole()

  const roleColors = {
    manager: 'bg-indigo-50 text-indigo-700',
    bailiff: 'bg-gray-100 text-gray-700',
  }

  const handleRemove = () => {
    if (!confirm('Remove this team member?')) return
    removeMember(
      { lakeId, memberId: member.id },
      {
        onSuccess: () => toast.success('Team member removed'),
        onError: () => toast.error('Failed to remove team member'),
      }
    )
  }

  const handleRoleChange = (newRole: 'manager' | 'bailiff') => {
    updateRole(
      { memberId: member.id, lakeId, role: newRole },
      {
        onSuccess: () => toast.success('Role updated'),
        onError: () => toast.error('Failed to update role'),
      }
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
        {member.profile?.display_name?.[0] || member.profile?.username?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {member.profile?.display_name || member.profile?.username || 'Unknown'}
        </p>
        {isOwner ? (
          <select
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value as 'manager' | 'bailiff')}
            disabled={isUpdating}
            className="mt-1 text-xs rounded border-gray-200 py-0.5 px-1"
          >
            <option value="manager">Manager</option>
            <option value="bailiff">Bailiff</option>
          </select>
        ) : (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${roleColors[member.role]}`}>
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </span>
        )}
      </div>
      {isOwner && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

// Add team member form
function AddTeamMemberForm({ lakeId }: { lakeId: string }) {
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'manager' | 'bailiff'>('bailiff')
  const [isSearching, setIsSearching] = useState(false)
  const { mutate: addMember, isPending: isAdding } = useAddLakeTeamMember()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsSearching(true)

    // Look up user by username
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .single()

    setIsSearching(false)

    if (error || !profile) {
      toast.error('User not found. Check the username.')
      return
    }

    addMember(
      { lakeId, userId: profile.id, role },
      {
        onSuccess: () => {
          toast.success('Team member added!')
          setUsername('')
        },
        onError: (err) => {
          if (err.message.includes('duplicate')) {
            toast.error('This user is already a team member')
          } else {
            toast.error('Failed to add team member')
          }
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-4 mt-4">
      <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
        <UserPlus size={14} /> Add Team Member
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'manager' | 'bailiff')}
          className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
        >
          <option value="bailiff">Bailiff</option>
          <option value="manager">Manager</option>
        </select>
        <button
          type="submit"
          disabled={isAdding || isSearching || !username.trim()}
          className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:bg-navy-400"
        >
          {isAdding || isSearching ? '...' : 'Add'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-500">
        <strong>Manager:</strong> Can edit lake details and see all stats.{' '}
        <strong>Bailiff:</strong> View-only dashboard access.
      </p>
    </form>
  )
}
