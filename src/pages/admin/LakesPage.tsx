import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Search, Check, X, Crown, MapPin, Globe, AlertCircle, UserCheck, User, ExternalLink, Phone, Mail, FileText, Users, Trash2, Flag } from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { Lake } from '../../types'
import { useLakeTeam, useAddLakeTeamMember, useRemoveLakeTeamMember, useUpdateLakeTeamRole } from '../../hooks/useLakeTeam'
import { useAllLakeReports, useUpdateLakeReportStatus, REPORT_REASON_LABELS, type LakeReport } from '../../hooks/useLakeReports'

type LakeFilter = 'all' | 'unverified' | 'verified' | 'premium' | 'claimed' | 'reports'

type AdminLakeOwner = {
  id: string
  username: string | null
  email: string | null
}

type AdminLakeClaim = {
  id: string
  lake_id: string
  user_id: string
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user?: AdminLakeOwner | null
  // Extended fields
  role?: string | null
  business_name?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
  proof_url?: string | null
  proof_type?: string | null
  lake_details?: Record<string, any> | null
  interested_in_premium?: boolean
}

type AdminLake = Lake & {
  owner?: AdminLakeOwner | null
  claims?: AdminLakeClaim[]
}

export default function LakesPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<LakeFilter>('unverified')
  const [searchTerm, setSearchTerm] = useState('')
  const [verifyingLakeId, setVerifyingLakeId] = useState<string | null>(null)
  const [premiumLakeId, setPremiumLakeId] = useState<string | null>(null)
  const [ownerLakeId, setOwnerLakeId] = useState<string | null>(null)
  const [claimUpdatingId, setClaimUpdatingId] = useState<string | null>(null)
  const [showAddLake, setShowAddLake] = useState(false)
  const [teamModalLakeId, setTeamModalLakeId] = useState<string | null>(null)
  const [newLake, setNewLake] = useState({
    name: '',
    latitude: '',
    longitude: '',
    region: '',
    water_type: 'lake' as 'lake' | 'pond' | 'reservoir' | 'river' | 'canal' | 'other',
    day_ticket_price: '',
    website: '',
  })

  // Fetch lake reports for the reports tab
  const { data: reports = [], isLoading: reportsLoading } = useAllLakeReports(
    filter === 'reports' ? 'pending' : undefined
  )
  const updateReportStatus = useUpdateLakeReportStatus()

  const { data: lakes, isLoading } = useQuery({
    queryKey: ['admin-lakes', filter, searchTerm],
    queryFn: async () => {
      // Skip fetching lakes if we're on the reports tab
      if (filter === 'reports') return []

      let query = supabase
        .from('lakes')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter === 'unverified') query = query.eq('is_verified', false)
      if (filter === 'verified') query = query.eq('is_verified', true)
      if (filter === 'premium') query = query.eq('is_premium', true)
      if (filter === 'claimed') query = query.not('claimed_by', 'is', null)

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      const { data, error } = await query.limit(50)
      if (error) throw error

      const lakeRows = (data || []) as (Lake & { claimed_by?: string | null })[]

      // Attach owner profile info for claimed lakes
      const claimedIds = Array.from(
        new Set(
          lakeRows
            .map((l) => l.claimed_by)
            .filter((id): id is string => !!id)
        )
      )

      let ownersById: Record<string, AdminLakeOwner> = {}
      if (claimedIds.length > 0) {
        const { data: owners, error: ownersError } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', claimedIds)

        if (!ownersError && owners) {
          ownersById = owners.reduce((acc, o) => {
            acc[o.id] = {
              id: o.id,
              username: (o as any).username ?? null,
              email: (o as any).email ?? null,
            }
            return acc
          }, {} as Record<string, AdminLakeOwner>)
        }
      }

      // Fetch pending claims for these lakes
      const lakeIds = lakeRows.map((l) => l.id)
      let claimsByLakeId: Record<string, AdminLakeClaim[]> = {}
      if (lakeIds.length > 0) {
        const { data: claims, error: claimsError } = await supabase
          .from('lake_claims')
          .select('id, lake_id, user_id, message, status, created_at, role, business_name, website, phone, email, proof_url, proof_type, lake_details, interested_in_premium')
          .in('lake_id', lakeIds)
          .eq('status', 'pending')

        if (!claimsError && claims) {
          // Load claimant profiles
          const claimantIds = Array.from(new Set(claims.map((c) => c.user_id)))
          let claimantById: Record<string, AdminLakeOwner> = {}
          if (claimantIds.length > 0) {
            const { data: claimProfiles } = await supabase
              .from('profiles')
              .select('id, username, email')
              .in('id', claimantIds)

            if (claimProfiles) {
              claimantById = claimProfiles.reduce((acc, p) => {
                acc[p.id] = {
                  id: p.id,
                  username: (p as any).username ?? null,
                  email: (p as any).email ?? null,
                }
                return acc
              }, {} as Record<string, AdminLakeOwner>)
            }
          }

          claimsByLakeId = claims.reduce((acc, c) => {
            const claim: AdminLakeClaim = {
              id: c.id,
              lake_id: c.lake_id,
              user_id: c.user_id,
              message: c.message,
              status: c.status as AdminLakeClaim['status'],
              created_at: c.created_at,
              user: claimantById[c.user_id] ?? null,
              // Extended fields
              role: (c as any).role ?? null,
              business_name: (c as any).business_name ?? null,
              website: (c as any).website ?? null,
              phone: (c as any).phone ?? null,
              email: (c as any).email ?? null,
              proof_url: (c as any).proof_url ?? null,
              proof_type: (c as any).proof_type ?? null,
              lake_details: (c as any).lake_details ?? null,
              interested_in_premium: (c as any).interested_in_premium ?? false,
            }
            if (!acc[c.lake_id]) acc[c.lake_id] = []
            acc[c.lake_id].push(claim)
            return acc
          }, {} as Record<string, AdminLakeClaim[]>)
        }
      }

      const enriched: AdminLake[] = lakeRows.map((lake) => ({
        ...lake,
        owner: lake.claimed_by ? ownersById[lake.claimed_by] ?? null : null,
        claims: claimsByLakeId[lake.id] ?? [],
      }))

      return enriched
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-lakes'] })
  }

  const verifyLake = useMutation({
    mutationFn: async ({ lakeId, verified }: { lakeId: string; verified: boolean }) => {
      const { error } = await supabase
        .from('lakes')
        .update({ is_verified: verified })
        .eq('id', lakeId)
      if (error) throw error
    },
    onMutate: ({ lakeId }) => {
      setVerifyingLakeId(lakeId)
    },
    onSuccess: (_data, variables) => {
      // Optimistically update current list so the UI reflects verification immediately
      const { lakeId, verified } = variables
      queryClient.setQueryData<AdminLake[] | undefined>(
        ['admin-lakes', filter, searchTerm],
        (prev) =>
          prev?.map((lake) =>
            lake.id === lakeId
              ? { ...lake, is_verified: verified }
              : lake
          ) ?? prev
      )

      invalidate()
      toast.success('Lake verification updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      setVerifyingLakeId(null)
    },
  })

  const clearOwner = useMutation({
    mutationFn: async ({ lakeId }: { lakeId: string }) => {
      const { error } = await supabase
        .from('lakes')
        .update({ claimed_by: null, claimed_at: null, is_verified: false })
        .eq('id', lakeId)
      if (error) throw error
    },
    onMutate: ({ lakeId }) => {
      setOwnerLakeId(lakeId)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Lake owner removed')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      setOwnerLakeId(null)
    },
  })

  const assignOwner = useMutation({
    mutationFn: async ({ lakeId, email }: { lakeId: string; email: string }) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (error) throw error
      if (!profile) {
        throw new Error('No user found with that email')
      }

      const { error: updateError } = await supabase
        .from('lakes')
        .update({ claimed_by: profile.id, claimed_at: new Date().toISOString() })
        .eq('id', lakeId)

      if (updateError) throw updateError
    },
    onMutate: ({ lakeId }) => {
      setOwnerLakeId(lakeId)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Lake owner assigned')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      setOwnerLakeId(null)
    },
  })

  const setPremium = useMutation({
    mutationFn: async ({ lakeId, months }: { lakeId: string; months: number }) => {
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + months)

      const { error } = await supabase
        .from('lakes')
        .update({ is_premium: true, premium_expires_at: expiresAt.toISOString() })
        .eq('id', lakeId)
      if (error) throw error
    },
    onMutate: ({ lakeId }) => {
      setPremiumLakeId(lakeId)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Lake set as premium')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      setPremiumLakeId(null)
    },
  })

  const approveClaim = useMutation({
    mutationFn: async ({
      claimId,
      lakeId,
      userId,
    }: {
      claimId: string
      lakeId: string
      userId: string
    }) => {
      const now = new Date().toISOString()

      const { error: lakeError } = await supabase
        .from('lakes')
        .update({ claimed_by: userId, claimed_at: now, is_verified: true })
        .eq('id', lakeId)
      if (lakeError) throw lakeError

      const { error: claimError } = await supabase
        .from('lake_claims')
        .update({ status: 'approved', reviewed_at: now })
        .eq('id', claimId)
      if (claimError) throw claimError
    },
    onMutate: ({ claimId }) => {
      setClaimUpdatingId(claimId)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Claim approved and owner assigned')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      setClaimUpdatingId(null)
    },
  })

  const rejectClaim = useMutation({
    mutationFn: async ({ claimId, reason }: { claimId: string; reason: string | null }) => {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('lake_claims')
        .update({ status: 'rejected', decision_reason: reason, reviewed_at: now })
        .eq('id', claimId)
      if (error) throw error
    },
    onMutate: ({ claimId }) => {
      setClaimUpdatingId(claimId)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Claim rejected')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      setClaimUpdatingId(null)
    },
  })

  const createLake = useMutation({
    mutationFn: async () => {
      const lat = parseFloat(newLake.latitude)
      const lng = parseFloat(newLake.longitude)
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new Error('Latitude and longitude must be valid numbers')
      }

      const dayPrice = newLake.day_ticket_price
        ? parseFloat(newLake.day_ticket_price)
        : null

      const { error } = await supabase.from('lakes').insert({
        name: newLake.name.trim(),
        latitude: lat,
        longitude: lng,
        region: newLake.region.trim() || null,
        water_type: newLake.water_type,
        day_ticket_price: dayPrice,
        website: newLake.website.trim() || null,
        is_verified: true,
        is_premium: false,
      })

      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success('Lake added')
      setShowAddLake(false)
      setNewLake({
        name: '',
        latitude: '',
        longitude: '',
        region: '',
        water_type: 'lake',
        day_ticket_price: '',
        website: '',
      })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const clearPremium = useMutation({
    mutationFn: async ({ lakeId }: { lakeId: string }) => {
      const { error } = await supabase
        .from('lakes')
        .update({ is_premium: false, premium_expires_at: null })
        .eq('id', lakeId)
      if (error) throw error
    },
    onMutate: ({ lakeId }) => {
      setPremiumLakeId(lakeId)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Premium removed')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      setPremiumLakeId(null)
    },
  })

  const deleteLake = useMutation({
    mutationFn: async ({ lakeId }: { lakeId: string }) => {
      // Delete lake - cascades will handle related records (lake_team, lake_announcements, etc.)
      const { error } = await supabase
        .from('lakes')
        .delete()
        .eq('id', lakeId)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success('Lake deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const filters: { value: LakeFilter; label: string }[] = [
    { value: 'unverified', label: 'Unverified' },
    { value: 'verified', label: 'Verified' },
    { value: 'premium', label: 'Premium' },
    { value: 'claimed', label: 'Claimed' },
    { value: 'reports', label: `Reports${reports.length > 0 ? ` (${reports.length})` : ''}` },
    { value: 'all', label: 'All' },
  ]

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:mb-8">
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Lakes & Venues</h1>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    filter === f.value
                      ? 'bg-navy-800 text-white'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
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
                  placeholder="Search lakes..."
                  className="w-full rounded-lg border-2 border-border bg-background text-foreground py-2 pl-10 pr-4 text-sm focus:border-navy-800 focus:outline-none sm:w-64"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddLake(true)}
                className="rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-900"
              >
                + Add Lake
              </button>
            </div>
          </div>
        </div>

        {/* Lakes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : lakes && lakes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {lakes.map((lake) => (
              <LakeCard
                key={lake.id}
                lake={lake}
                onVerify={(verified) => verifyLake.mutate({ lakeId: lake.id, verified })}
                onSetPremium={(months) => setPremium.mutate({ lakeId: lake.id, months })}
                onClearPremium={() => clearPremium.mutate({ lakeId: lake.id })}
                isUpdatingVerify={verifyingLakeId === lake.id && verifyLake.isPending}
                isUpdatingPremium={
                  premiumLakeId === lake.id && (setPremium.isPending || clearPremium.isPending)
                }
                claimUpdatingId={claimUpdatingId}
                onApproveClaim={(claim) =>
                  approveClaim.mutate({ claimId: claim.id, lakeId: lake.id, userId: claim.user_id })
                }
                onRejectClaim={(claim, reason) =>
                  rejectClaim.mutate({ claimId: claim.id, reason: reason || null })
                }
                onManageTeam={() => setTeamModalLakeId(lake.id)}
                onDelete={() => {
                  if (confirm(`Are you sure you want to delete "${lake.name}"? This cannot be undone.`)) {
                    deleteLake.mutate({ lakeId: lake.id })
                  }
                }}
                isDeleting={deleteLake.isPending}
              />
            ))}
          </div>
        ) : filter === 'reports' ? (
          /* Reports View */
          reportsLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-muted p-6 text-muted-foreground">
              <span>Loading reports...</span>
            </div>
          ) : reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onResolve={() => {
                    updateReportStatus.mutate(
                      { reportId: report.id, status: 'resolved' },
                      {
                        onSuccess: () => toast.success('Report marked as resolved'),
                        onError: () => toast.error('Failed to update report'),
                      }
                    )
                  }}
                  onDismiss={() => {
                    updateReportStatus.mutate(
                      { reportId: report.id, status: 'dismissed' },
                      {
                        onSuccess: () => toast.success('Report dismissed'),
                        onError: () => toast.error('Failed to update report'),
                      }
                    )
                  }}
                  isUpdating={updateReportStatus.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-muted p-6 text-muted-foreground">
              <Check size={20} className="text-green-500" />
              <span>No pending reports</span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-muted p-6 text-muted-foreground">
            <AlertCircle size={20} />
            <span>No lakes found for this filter</span>
          </div>
        )}
      </div>

      {/* Add Lake Modal */}
      {showAddLake && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="mb-3 text-lg font-bold text-foreground">Add Lake</h2>

            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Name</label>
                <input
                  type="text"
                  value={newLake.name}
                  onChange={(e) => setNewLake((l) => ({ ...l, name: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Latitude</label>
                  <input
                    type="text"
                    value={newLake.latitude}
                    onChange={(e) => setNewLake((l) => ({ ...l, latitude: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Longitude</label>
                  <input
                    type="text"
                    value={newLake.longitude}
                    onChange={(e) => setNewLake((l) => ({ ...l, longitude: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Region</label>
                <input
                  type="text"
                  value={newLake.region}
                  onChange={(e) => setNewLake((l) => ({ ...l, region: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Water type</label>
                <select
                  value={newLake.water_type}
                  onChange={(e) =>
                    setNewLake((l) => ({ ...l, water_type: e.target.value as any }))
                  }
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
                >
                  <option value="lake">Lake</option>
                  <option value="pond">Pond</option>
                  <option value="reservoir">Reservoir</option>
                  <option value="river">River</option>
                  <option value="canal">Canal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Day ticket price (£)
                  </label>
                  <input
                    type="text"
                    value={newLake.day_ticket_price}
                    onChange={(e) =>
                      setNewLake((l) => ({ ...l, day_ticket_price: e.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Website</label>
                  <input
                    type="text"
                    value={newLake.website}
                    onChange={(e) => setNewLake((l) => ({ ...l, website: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddLake(false)}
                className="rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createLake.mutate()}
                disabled={createLake.isPending}
                className="rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
              >
                {createLake.isPending ? 'Saving…' : 'Save lake'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Management Modal */}
      {teamModalLakeId && (
        <TeamManagementModal
          lakeId={teamModalLakeId}
          lakeName={lakes?.find((l) => l.id === teamModalLakeId)?.name || 'Lake'}
          onClose={() => setTeamModalLakeId(null)}
        />
      )}
    </AdminLayout>
  )
}

// Team Management Modal Component
function TeamManagementModal({
  lakeId,
  lakeName,
  onClose,
}: {
  lakeId: string
  lakeName: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'manager' | 'bailiff' | 'owner'>('bailiff')
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<{ id: string; username: string; email: string | null }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: teamData, isLoading, refetch } = useLakeTeam(lakeId)
  const { mutate: addMember, isPending: isAdding } = useAddLakeTeamMember()
  const { mutate: removeMember } = useRemoveLakeTeamMember()
  const { mutate: updateRole } = useUpdateLakeTeamRole()

  // Search for users as they type
  const handleUsernameChange = async (value: string) => {
    setUsername(value)
    setSelectedUserId(null)
    
    if (value.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, username, email')
      .or(`username.ilike.%${value}%,email.ilike.%${value}%`)
      .limit(5)

    setSuggestions(data || [])
    setShowSuggestions(true)
  }

  const selectSuggestion = (profile: { id: string; username: string; email: string | null }) => {
    setUsername(profile.username || profile.email || '')
    setSelectedUserId(profile.id)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    let userId = selectedUserId

    // If no user selected from suggestions, search for exact match
    if (!userId) {
      setIsSearching(true)
      const searchTerm = username.trim().toLowerCase()
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, email')
        .or(`username.eq.${searchTerm},email.eq.${searchTerm}`)
        .maybeSingle()

      setIsSearching(false)

      if (error || !profile) {
        toast.error('User not found. Check the username or email.')
        return
      }
      userId = profile.id
    }

    // Handle owner assignment separately
    if (role === 'owner') {
      const { error } = await supabase
        .from('lakes')
        .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
        .eq('id', lakeId)

      if (error) {
        toast.error('Failed to assign owner')
        return
      }

      // Send notification to the new owner
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'lake_owner_assigned',
        title: 'You\'re now a lake owner!',
        message: `You have been assigned as the owner of ${lakeName}`,
        related_lake_id: lakeId,
        action_url: `/lakes/${lakeId}/dashboard`,
      })

      toast.success('Owner assigned!')
      setUsername('')
      setSelectedUserId(null)
      refetch()
      queryClient.invalidateQueries({ queryKey: ['admin-lakes'] })
      return
    }

    addMember(
      { lakeId, userId: userId!, role: role as 'manager' | 'bailiff' },
      {
        onSuccess: () => {
          toast.success('Team member added!')
          setUsername('')
          setSelectedUserId(null)
          refetch()
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

  const handleRemove = (memberId: string) => {
    if (!confirm('Remove this team member?')) return
    removeMember(
      { lakeId, memberId },
      {
        onSuccess: () => toast.success('Team member removed'),
        onError: () => toast.error('Failed to remove'),
      }
    )
  }

  const handleRemoveOwner = async () => {
    if (!confirm('Remove the owner from this lake?')) return
    
    const { error } = await supabase
      .from('lakes')
      .update({ claimed_by: null, claimed_at: null })
      .eq('id', lakeId)

    if (error) {
      toast.error('Failed to remove owner')
      return
    }

    toast.success('Owner removed')
    refetch()
    queryClient.invalidateQueries({ queryKey: ['admin-lakes'] })
  }

  const handleRoleChange = (memberId: string, newRole: 'manager' | 'bailiff') => {
    updateRole(
      { memberId, lakeId, role: newRole },
      {
        onSuccess: () => toast.success('Role updated'),
        onError: () => toast.error('Failed to update role'),
      }
    )
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Manage Team</h2>
            <p className="text-sm text-muted-foreground">{lakeName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading team...</p>
        ) : (
          <div className="space-y-4">
            {/* Owner */}
            {teamData?.owner && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-900/20 border border-amber-500/30">
                <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
                  {(teamData.owner as any).full_name?.[0] || (teamData.owner as any).username?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {(teamData.owner as any).full_name || (teamData.owner as any).username || 'Unknown'}
                  </p>
                  <p className="text-xs text-amber-500 font-medium flex items-center gap-1">
                    <Crown size={12} /> Owner
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveOwner}
                  className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Remove owner"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {!teamData?.owner && (
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-sm text-muted-foreground">No owner assigned</p>
                <p className="text-xs text-muted-foreground mt-1">Select "Owner" role below to assign</p>
              </div>
            )}

            {/* Team members */}
            {teamData?.team && teamData.team.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Team Members</p>
                {teamData.team.map((member) => {
                  const profile = member.profile as any
                  const displayName = profile?.full_name || profile?.username || 'Unknown'
                  const initial = displayName[0]?.toUpperCase() || '?'
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-muted-foreground font-bold text-sm">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {displayName}
                        </p>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as 'manager' | 'bailiff')}
                          className="mt-1 text-xs rounded border-border bg-background py-0.5 px-1"
                        >
                          <option value="manager">Manager</option>
                          <option value="bailiff">Bailiff</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(member.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add team member form */}
            <form onSubmit={handleAddMember} className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                <Users size={14} /> Add Team Member
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Username or email"
                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                  />
                  {/* Autocomplete dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                      {suggestions.map((profile) => (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => selectSuggestion(profile)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {profile.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{profile.username || 'No username'}</p>
                            {profile.email && (
                              <p className="text-xs text-muted-foreground">{profile.email}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'manager' | 'bailiff' | 'owner')}
                  className="rounded-lg border border-border bg-background text-foreground px-2 py-2 text-sm"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="bailiff">Bailiff</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isAdding || isSearching || !username.trim()}
                className="mt-2 w-full rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:bg-navy-400"
              >
                {isAdding || isSearching ? 'Adding...' : 'Add Member'}
              </button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                <strong>Owner:</strong> Full control, can manage team.{' '}
                <strong>Manager:</strong> Can edit lake details.{' '}
                <strong>Bailiff:</strong> View-only access.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function LakeCard({
  lake,
  onVerify,
  onSetPremium,
  onClearPremium,
  isUpdatingVerify,
  isUpdatingPremium,
  claimUpdatingId,
  onApproveClaim,
  onRejectClaim,
  onManageTeam,
  onDelete,
  isDeleting,
}: {
  lake: AdminLake
  onVerify: (verified: boolean) => void
  onSetPremium: (months: number) => void
  onClearPremium: () => void
  isUpdatingVerify: boolean
  isUpdatingPremium: boolean
  claimUpdatingId: string | null
  onApproveClaim: (claim: AdminLakeClaim) => void
  onRejectClaim: (claim: AdminLakeClaim, reason: string | null) => void
  onManageTeam: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const hasPendingClaims = (lake.claims?.length || 0) > 0

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:p-6">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">{lake.name}</h3>
            {lake.is_verified && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                <UserCheck size={12} />
                Verified
              </span>
            )}
            {lake.is_premium && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                <Crown size={12} />
                Premium
              </span>
            )}
          </div>
          {lake.region && <p className="text-sm text-muted-foreground">{lake.region}</p>}
          {lake.owner && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <User size={12} className="flex-shrink-0" />
              <span className="truncate">
                Owner: {lake.owner.username || lake.owner.email || lake.owner.id}
              </span>
            </div>
          )}
          {!lake.owner && hasPendingClaims && (
            <p className="mt-1 text-xs text-amber-700">
              {lake.claims!.length} pending claim{lake.claims!.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="mb-4 space-y-1.5 text-sm text-muted-foreground">
        {lake.address && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="line-clamp-1">{lake.address}</span>
          </div>
        )}
        {lake.website && (
          <div className="flex items-center gap-2">
            <Globe size={14} className="flex-shrink-0" />
            <a
              href={lake.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-navy-800 hover:underline"
            >
              <span className="line-clamp-1">{lake.website}</span>
            </a>
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {typeof lake.total_sessions === 'number' && (
            <span>Sessions: {lake.total_sessions}</span>
          )}
          {typeof lake.total_catches === 'number' && (
            <span>Catches: {lake.total_catches}</span>
          )}
          {lake.claimed_by && <span>Claimed</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {/* Verify / Unverify */}
        <button
          type="button"
          onClick={() => onVerify(!lake.is_verified)}
          disabled={isUpdatingVerify}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
        >
          {lake.is_verified ? (
            <>
              <X size={16} />
              <span>{isUpdatingVerify ? 'Updating...' : 'Unverify'}</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>{isUpdatingVerify ? 'Updating...' : 'Verify'}</span>
            </>
          )}
        </button>

        {/* Premium Controls */}
        {lake.is_premium ? (
          <button
            type="button"
            onClick={onClearPremium}
            disabled={isUpdatingPremium}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/80 disabled:opacity-60"
          >
            <Crown size={16} />
            <span>{isUpdatingPremium ? 'Updating...' : 'Remove Premium'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              const months = parseInt(prompt('Premium months (e.g. 12):') || '0', 10)
              if (months > 0) onSetPremium(months)
            }}
            disabled={isUpdatingPremium}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
          >
            <Crown size={16} />
            <span>{isUpdatingPremium ? 'Updating...' : 'Set Premium'}</span>
          </button>
        )}

        {/* View on Map */}
        <a
          href={`https://www.google.com/maps?q=${lake.latitude},${lake.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/80"
        >
          <MapPin size={16} />
          <span>Map</span>
        </a>

        {/* Manage Team */}
        <button
          type="button"
          onClick={onManageTeam}
          className="flex items-center justify-center gap-1 rounded-lg bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-200"
        >
          <Users size={16} />
          <span>Team</span>
        </button>

        {/* Delete Lake */}
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center justify-center gap-1 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
        >
          <Trash2 size={16} />
          <span>{isDeleting ? '...' : 'Delete'}</span>
        </button>
      </div>

      {/* Claim review (collapsed by default) */}
      {hasPendingClaims && (
        <details className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-foreground">
          <summary className="cursor-pointer list-none font-semibold text-amber-800">
            Review claims ({lake.claims!.length})
          </summary>
          <div className="mt-3 space-y-3">
            {lake.claims!.map((claim) => {
              const claimant = claim.user
              const isUpdating = claimUpdatingId === claim.id
              const details = claim.lake_details || {}
              return (
                <div
                  key={claim.id}
                  className="rounded-md bg-card p-3 shadow-sm ring-1 ring-amber-100"
                >
                  {/* Header */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {claimant?.username || claimant?.email || claim.user_id}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(claim.created_at).toLocaleString()}
                      </p>
                    </div>
                    {claim.interested_in_premium && (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        💰 Wants Premium
                      </span>
                    )}
                  </div>

                  {/* Role & Business */}
                  <div className="mb-2 space-y-1 border-b border-border pb-2">
                    {claim.role && (
                      <p className="text-[11px]">
                        <span className="font-medium text-foreground">Role:</span>{' '}
                        <span className="capitalize">{claim.role}</span>
                      </p>
                    )}
                    {claim.business_name && (
                      <p className="text-[11px]">
                        <span className="font-medium text-foreground">Business:</span> {claim.business_name}
                      </p>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="mb-2 flex flex-wrap gap-3 text-[11px]">
                    {claim.email && (
                      <a href={`mailto:${claim.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Mail size={10} /> {claim.email}
                      </a>
                    )}
                    {claim.phone && (
                      <a href={`tel:${claim.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Phone size={10} /> {claim.phone}
                      </a>
                    )}
                    {claim.website && (
                      <a href={claim.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                        <ExternalLink size={10} /> Website
                      </a>
                    )}
                  </div>

                  {/* Proof */}
                  {claim.proof_type && (
                    <div className="mb-2 rounded bg-muted p-2">
                      <p className="text-[11px]">
                        <span className="font-medium text-foreground">Proof:</span>{' '}
                        <span className="capitalize">{claim.proof_type.replace(/_/g, ' ')}</span>
                      </p>
                      {claim.proof_url && (
                        <a
                          href={claim.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                        >
                          <FileText size={10} /> View document
                        </a>
                      )}
                    </div>
                  )}

                  {/* Venue Details */}
                  {Object.keys(details).length > 0 && (
                    <div className="mb-2 rounded bg-muted p-2 text-[11px]">
                      <p className="mb-1 font-medium text-foreground">Submitted venue details:</p>
                      <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                        {details.water_type && <span>Water: {details.water_type}</span>}
                        {details.lake_type && <span>Type: {details.lake_type}</span>}
                        {details.day_ticket_price && <span>Day: £{details.day_ticket_price}</span>}
                        {details.night_ticket_price && <span>Night: £{details.night_ticket_price}</span>}
                      </div>
                      {details.facilities?.length > 0 && (
                        <p className="mt-1 text-muted-foreground">
                          Facilities: {details.facilities.join(', ')}
                        </p>
                      )}
                      {details.description && (
                        <p className="mt-1 text-muted-foreground line-clamp-2">{details.description}</p>
                      )}
                    </div>
                  )}

                  {/* Legacy message */}
                  {claim.message && (
                    <p className="mb-2 text-[11px] italic text-muted-foreground">"{claim.message}"</p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onApproveClaim(claim)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-navy-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
                    >
                      <Check size={12} />
                      <span>{isUpdating ? 'Approving…' : 'Approve & assign owner'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => {
                        const reason = window.prompt('Reason for rejection (optional):')
                        onRejectClaim(claim, reason ?? null)
                      }}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 disabled:opacity-60"
                    >
                      <X size={12} />
                      <span>{isUpdating ? 'Rejecting…' : 'Reject'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}

// Report Card component for admin reports view
function ReportCard({
  report,
  onResolve,
  onDismiss,
  isUpdating,
}: {
  report: LakeReport
  onResolve: () => void
  onDismiss: () => void
  isUpdating: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Flag size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-foreground">
              {REPORT_REASON_LABELS[report.reason]}
            </span>
          </div>
          
          {report.lake && (
            <p className="text-sm text-foreground">
              <span className="font-medium">{report.lake.name}</span>
              {report.lake.region && (
                <span className="text-muted-foreground"> · {report.lake.region}</span>
              )}
            </p>
          )}

          {report.details && (
            <p className="mt-2 text-sm text-muted-foreground bg-muted rounded-lg p-2">
              "{report.details}"
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {report.reporter && (
              <span>Reported by: {report.reporter.display_name || report.reporter.username}</span>
            )}
            <span>·</span>
            <span>{new Date(report.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResolve}
            disabled={isUpdating}
            className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-50"
          >
            <Check size={14} />
            Resolve
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={isUpdating}
            className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/80 disabled:opacity-50"
          >
            <X size={14} />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
