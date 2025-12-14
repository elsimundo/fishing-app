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
  ChevronUp,
  Megaphone,
  Pin,
  X,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { UpgradeToPremiumCard } from '../components/lakes/UpgradeToPremiumCard'
import { useLakeRole, useLakeTeam, useAddLakeTeamMember, useRemoveLakeTeamMember, useUpdateLakeTeamRole } from '../hooks/useLakeTeam'
import { useLakeAnnouncements, useCreateLakeAnnouncement, useDeleteLakeAnnouncement } from '../hooks/useLakeAnnouncements'
import { EditLakeModal } from '../components/lakes/EditLakeModal'
import { toast } from 'react-hot-toast'

export default function LakeOwnerDashboard() {
  const { lakeId } = useParams<{ lakeId: string }>()
  const navigate = useNavigate()
  const [showTeamSection, setShowTeamSection] = useState(false)
  const [showAnnouncementsSection, setShowAnnouncementsSection] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

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
  
  // Get announcements
  const { data: announcements } = useLakeAnnouncements(lakeId)

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

      // Get fish health reports
      let healthReports: Catch[] = []
      if (sessionIds.length > 0) {
        const { data: healthData } = await supabase
          .from('catches')
          .select('id, species, weight_kg, caught_at, fish_health_issue, fish_health_type, fish_health_notes, treatment_applied, treatment_notes, peg_swim')
          .in('session_id', sessionIds)
          .eq('fish_health_issue', true)
          .order('caught_at', { ascending: false })
          .limit(20)
        healthReports = (healthData || []) as Catch[]
      }

      return {
        totalSessions: sessions?.length || 0,
        totalCatches: catches.length,
        uniqueAnglers,
        topSpecies,
        monthlyData,
        bestDay: bestDay ? { name: dayNames[parseInt(bestDay[0])], count: bestDay[1] } : null,
        avgCatchesPerSession: sessions?.length ? (catches.length / sessions.length).toFixed(1) : '0',
        healthReports,
        healthReportCount: healthReports.length,
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
          <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
            <Lock size={48} className="mx-auto text-muted-foreground" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">
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
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {isLoading && (
          <div className="rounded-2xl bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        )}

        {!isLoading && lake && analytics && (
          <div className="space-y-4">
            {/* Header */}
            <div className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 size={20} className="text-primary" />
                    <h1 className="text-xl font-bold text-foreground">Owner Dashboard</h1>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{lake.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-900"
                    >
                      Edit Details
                    </button>
                  )}
                  {isPremium ? (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                      <Crown size={14} /> Premium
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      <Crown size={14} /> Premium Coming Soon
                    </span>
                  )}
                </div>
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
              <div className="rounded-2xl bg-card p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-foreground">Activity Trend (6 months)</h2>
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
                        <p className="mt-2 text-[10px] text-muted-foreground">{m.month}</p>
                        <p className="text-[10px] font-medium text-foreground">{m.sessions + m.catches}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-border bg-muted p-5">
                <div className="flex items-center gap-3">
                  <Lock size={24} className="text-muted-foreground" />
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Activity Trend</h2>
                    <p className="text-xs text-muted-foreground">Upgrade to Premium to see monthly trends</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Species */}
            <div className="rounded-2xl bg-card p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Top Species Caught</h2>
              {analytics.topSpecies.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topSpecies.map(([species, count], i) => (
                    <div key={species} className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-bold text-muted-foreground">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{species}</span>
                          <span className="text-xs text-muted-foreground">{count} catches</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
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
                <p className="text-sm text-muted-foreground">No catches recorded yet.</p>
              )}
            </div>

            {/* Best Day */}
            {analytics.bestDay && analytics.bestDay.count > 0 && (
              <div className="rounded-2xl bg-card p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-foreground">Busiest Day</h2>
                <p className="text-2xl font-bold text-primary">{analytics.bestDay.name}</p>
                <p className="text-xs text-muted-foreground">{analytics.bestDay.count} sessions</p>
              </div>
            )}

            {/* Premium-only: Profile views placeholder */}
            {isPremium ? (
              <div className="rounded-2xl bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Eye size={20} className="text-muted-foreground" />
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Profile Views</h2>
                    <p className="text-xs text-muted-foreground">Coming soon - track how many anglers view your venue</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Team Management - Owner & Manager only */}
            {canEdit && (
              <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
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
                      <h2 className="text-sm font-semibold text-foreground">Team Management</h2>
                      <p className="text-xs text-muted-foreground">
                        {teamData?.team.length || 0} team member{(teamData?.team.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {showTeamSection ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                </button>

                {showTeamSection && (
                  <div className="border-t border-border p-5 space-y-4">
                    {/* Owner */}
                    {teamData?.owner && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                        <div className="h-10 w-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-sm">
                          {teamData.owner.full_name?.[0] || teamData.owner.username?.[0] || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {teamData.owner.full_name || teamData.owner.username || 'Unknown'}
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
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
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Only the owner can add or remove team members.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Announcements Management - Owner & Manager only */}
            {canEdit && (
              <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementsSection(!showAnnouncementsSection)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Megaphone size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Announcements</h2>
                      <p className="text-xs text-muted-foreground">
                        {announcements?.length || 0} active update{(announcements?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {showAnnouncementsSection ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                </button>

                {showAnnouncementsSection && (
                  <div className="border-t border-border p-5 space-y-4">
                    {/* Create new announcement */}
                    <CreateAnnouncementForm lakeId={lakeId!} />

                    {/* Existing announcements */}
                    {announcements && announcements.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        <p className="text-xs font-semibold text-foreground mb-3">Active Announcements</p>
                        {announcements.map((announcement) => (
                          <AnnouncementRow
                            key={announcement.id}
                            announcement={announcement}
                            lakeId={lakeId!}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fish Health Reports */}
            {analytics?.healthReports && analytics.healthReports.length > 0 && (
              <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Fish Health Reports</h2>
                      <p className="text-xs text-muted-foreground">
                        {analytics.healthReportCount} issue{analytics.healthReportCount !== 1 ? 's' : ''} reported by anglers
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {analytics.healthReports.map((report) => (
                    <div key={report.id} className="p-3 rounded-lg bg-muted space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{report.species}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.caught_at).toLocaleDateString('en-GB', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                            {report.peg_swim && ` • ${report.peg_swim}`}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          report.treatment_applied 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {report.treatment_applied ? (
                            <span className="flex items-center gap-1"><CheckCircle size={10} /> Treated</span>
                          ) : (
                            'Untreated'
                          )}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {report.fish_health_type && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            {report.fish_health_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        )}
                      </div>
                      {report.fish_health_notes && (
                        <p className="text-xs text-muted-foreground">{report.fish_health_notes}</p>
                      )}
                      {report.treatment_applied && report.treatment_notes && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          💊 {report.treatment_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
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

        {/* Edit Lake Modal */}
        {showEditModal && lake && (
          <EditLakeModal lake={lake} onClose={() => setShowEditModal(false)} />
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
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className={`inline-flex rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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
      full_name: string | null
      username: string | null
    } | null
  }
  lakeId: string
  isOwner: boolean
}) {
  const { mutate: removeMember, isPending: isRemoving } = useRemoveLakeTeamMember()
  const { mutate: updateRole, isPending: isUpdating } = useUpdateLakeTeamRole()

  const roleColors = {
    manager: 'bg-indigo-50 text-indigo-700',
    bailiff: 'bg-muted text-muted-foreground',
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
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
      <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-muted-foreground font-bold text-sm">
        {member.profile?.full_name?.[0] || member.profile?.username?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {member.profile?.full_name || member.profile?.username || 'Unknown'}
        </p>
        {isOwner ? (
          <select
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value as 'manager' | 'bailiff')}
            disabled={isUpdating}
            className="mt-1 text-xs rounded border-border bg-background py-0.5 px-1"
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
          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
    <form onSubmit={handleSubmit} className="border-t border-border pt-4 mt-4">
      <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
        <UserPlus size={14} /> Add Team Member
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          className="flex-1 rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'manager' | 'bailiff')}
          className="rounded-lg border border-border bg-background text-foreground px-2 py-2 text-sm"
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
      <p className="mt-2 text-[11px] text-muted-foreground">
        <strong>Manager:</strong> Can edit lake details and see all stats.{' '}
        <strong>Bailiff:</strong> View-only dashboard access.
      </p>
    </form>
  )
}

// Create announcement form
function CreateAnnouncementForm({ lakeId }: { lakeId: string }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const { mutate: createAnnouncement, isPending } = useCreateLakeAnnouncement()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in both title and content')
      return
    }

    createAnnouncement(
      { lakeId, title: title.trim(), content: content.trim(), isPinned },
      {
        onSuccess: () => {
          toast.success('Announcement posted!')
          setTitle('')
          setContent('')
          setIsPinned(false)
        },
        onError: () => {
          toast.error('Failed to post announcement')
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1">
        <Megaphone size={14} /> Post New Update
      </p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g., 'Lake Closed for Restocking')"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
        maxLength={100}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Details about the update..."
        rows={3}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800 resize-none"
        maxLength={500}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded border-border"
          />
          <Pin size={12} />
          Pin to top
        </label>
        <button
          type="submit"
          disabled={isPending || !title.trim() || !content.trim()}
          className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:bg-navy-400"
        >
          {isPending ? 'Posting...' : 'Post Update'}
        </button>
      </div>
    </form>
  )
}

// Announcement row component
function AnnouncementRow({
  announcement,
  lakeId,
}: {
  announcement: {
    id: string
    title: string
    content: string
    is_pinned: boolean
    created_at: string
    author?: {
      username: string | null
      full_name: string | null
    }
  }
  lakeId: string
}) {
  const { mutate: deleteAnnouncement, isPending } = useDeleteLakeAnnouncement()

  const handleDelete = () => {
    if (!confirm('Delete this announcement?')) return
    deleteAnnouncement(
      { id: announcement.id, lakeId },
      {
        onSuccess: () => toast.success('Announcement deleted'),
        onError: () => toast.error('Failed to delete'),
      }
    )
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${announcement.is_pinned ? 'bg-amber-50' : 'bg-muted'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          {announcement.is_pinned && <Pin size={12} className="text-amber-600" />}
          {announcement.title}
        </p>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{announcement.content}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {new Date(announcement.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {' · '}
          {announcement.author?.full_name || announcement.author?.username || 'Staff'}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}
