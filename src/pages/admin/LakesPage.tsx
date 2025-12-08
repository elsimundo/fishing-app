import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Search, Check, X, Crown, MapPin, Globe, AlertCircle, UserCheck, User } from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { Lake } from '../../types'

type LakeFilter = 'all' | 'unverified' | 'verified' | 'premium' | 'claimed'

type AdminLakeOwner = {
  id: string
  username: string | null
  email: string | null
}

type AdminLake = Lake & {
  owner?: AdminLakeOwner | null
}

export default function LakesPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<LakeFilter>('unverified')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: lakes, isLoading } = useQuery({
    queryKey: ['admin-lakes', filter, searchTerm],
    queryFn: async () => {
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

      const enriched: AdminLake[] = lakeRows.map((lake) => ({
        ...lake,
        owner: lake.claimed_by ? ownersById[lake.claimed_by] ?? null : null,
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
    onSuccess: () => {
      invalidate()
      toast.success('Lake verification updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
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
    onSuccess: () => {
      invalidate()
      toast.success('Lake set as premium')
    },
    onError: (error: Error) => {
      toast.error(error.message)
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
    onSuccess: () => {
      invalidate()
      toast.success('Premium removed')
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
    { value: 'all', label: 'All' },
  ]

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:mb-8">
          <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Lakes & Venues</h1>

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
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search lakes..."
                className="w-full rounded-lg border-2 border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-navy-800 focus:outline-none sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Lakes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
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
                onClearOwner={() => clearOwner.mutate({ lakeId: lake.id })}
                onAssignOwner={(email) => assignOwner.mutate({ lakeId: lake.id, email })}
                isUpdatingVerify={verifyLake.isPending}
                isUpdatingPremium={setPremium.isPending || clearPremium.isPending}
                isUpdatingOwner={clearOwner.isPending || assignOwner.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-6 text-gray-600">
            <AlertCircle size={20} />
            <span>No lakes found for this filter</span>
          </div>
        )}

        {/* Owner / Claim controls */}
        {lake.claimed_by ? (
          <button
            type="button"
            onClick={onClearOwner}
            disabled={isUpdatingOwner}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
          >
            <User size={16} />
            <span>{isUpdatingOwner ? 'Updating...' : 'Remove Owner'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              const email = prompt('Owner email address:')?.trim()
              if (email) onAssignOwner(email)
            }}
            disabled={isUpdatingOwner}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-primary/60"
          >
            <User size={16} />
            <span>{isUpdatingOwner ? 'Updating...' : 'Assign Owner'}</span>
          </button>
        )}
      </div>
    </AdminLayout>
  )
}

function LakeCard({
  lake,
  onVerify,
  onSetPremium,
  onClearPremium,
  onClearOwner,
  onAssignOwner,
  isUpdatingVerify,
  isUpdatingPremium,
  isUpdatingOwner,
}: {
  lake: AdminLake
  onVerify: (verified: boolean) => void
  onSetPremium: (months: number) => void
  onClearPremium: () => void
  onClearOwner: () => void
  onAssignOwner: (email: string) => void
  isUpdatingVerify: boolean
  isUpdatingPremium: boolean
  isUpdatingOwner: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{lake.name}</h3>
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
          {lake.region && <p className="text-sm text-gray-600">{lake.region}</p>}
          {lake.owner && (
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <User size={12} className="flex-shrink-0" />
              <span className="truncate">
                Owner: {lake.owner.username || lake.owner.email || lake.owner.id}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="mb-4 space-y-1.5 text-sm text-gray-600">
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
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
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
      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        {/* Verify / Unverify */}
        <button
          type="button"
          onClick={() => onVerify(!lake.is_verified)}
          disabled={isUpdatingVerify}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-primary/60"
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
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
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
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-primary/60"
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
          className="flex items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          <MapPin size={16} />
          <span>Map</span>
        </a>
      </div>
    </div>
  )
}
