import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { AdminLayout } from '../../components/admin/AdminLayout'
import {
  Search,
  Check,
  X,
  Crown,
  Star,
  MapPin,
  Phone,
  Globe,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

type BusinessType = 'tackle_shop' | 'charter' | 'club' | 'guide'
type BusinessStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
type BusinessFilter = 'all' | 'pending' | 'approved' | 'premium' | 'featured'

interface Business {
  id: string
  name: string
  type: BusinessType
  description: string | null
  lat: number
  lng: number
  address: string | null
  city: string | null
  phone: string | null
  website: string | null
  is_premium: boolean
  premium_expires_at: string | null
  is_featured: boolean
  featured_position: number | null
  featured_expires_at: string | null
  status: BusinessStatus
  rejection_reason: string | null
  created_at: string
  source: string
}

export default function BusinessesPage() {
  const { user } = useAdminAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<BusinessFilter>('pending')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch businesses
  const { data: businesses, isLoading } = useQuery({
    queryKey: ['admin-businesses', filter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter === 'pending') query = query.eq('status', 'pending')
      if (filter === 'approved') query = query.eq('status', 'approved')
      if (filter === 'premium') query = query.eq('is_premium', true)
      if (filter === 'featured') query = query.eq('is_featured', true)

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      const { data, error } = await query.limit(50)
      if (error) throw error
      return data as Business[]
    },
  })

  // Approve business
  const approve = useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase.rpc('approve_business', {
        p_business_id: businessId,
        p_admin_id: user?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Business approved')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Reject business
  const reject = useMutation({
    mutationFn: async ({ businessId, reason }: { businessId: string; reason: string }) => {
      const { error } = await supabase.rpc('reject_business', {
        p_business_id: businessId,
        p_admin_id: user?.id,
        p_reason: reason,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Business rejected')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Set premium
  const setPremium = useMutation({
    mutationFn: async ({
      businessId,
      months,
      price,
    }: {
      businessId: string
      months: number
      price: number
    }) => {
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + months)

      const { error } = await supabase.rpc('set_business_premium', {
        p_business_id: businessId,
        p_admin_id: user?.id,
        p_expires_at: expiresAt.toISOString(),
        p_price_paid: price,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Premium status set')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Set featured
  const setFeatured = useMutation({
    mutationFn: async ({
      businessId,
      position,
      days,
    }: {
      businessId: string
      position: number
      days: number
    }) => {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)

      const { error } = await supabase.rpc('set_business_featured', {
        p_business_id: businessId,
        p_admin_id: user?.id,
        p_position: position,
        p_expires_at: expiresAt.toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Featured status set')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const filters: { value: BusinessFilter; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'premium', label: 'Premium' },
    { value: 'featured', label: 'Featured' },
    { value: 'all', label: 'All' },
  ]

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:mb-8">
          <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Businesses</h1>

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
                placeholder="Search..."
                className="w-full rounded-lg border-2 border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-navy-800 focus:outline-none sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Businesses Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : businesses && businesses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                onApprove={() => approve.mutate(business.id)}
                onReject={(reason) => reject.mutate({ businessId: business.id, reason })}
                onSetPremium={(months, price) =>
                  setPremium.mutate({ businessId: business.id, months, price })
                }
                onSetFeatured={(position, days) =>
                  setFeatured.mutate({ businessId: business.id, position, days })
                }
                isApproving={approve.isPending}
                isRejecting={reject.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-6 text-gray-600">
            <AlertCircle size={20} />
            <span>No businesses found for this filter</span>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function BusinessCard({
  business,
  onApprove,
  onReject,
  onSetPremium,
  onSetFeatured,
  isApproving,
  isRejecting,
}: {
  business: Business
  onApprove: () => void
  onReject: (reason: string) => void
  onSetPremium: (months: number, price: number) => void
  onSetFeatured: (position: number, days: number) => void
  isApproving: boolean
  isRejecting: boolean
}) {
  const typeLabels: Record<BusinessType, string> = {
    tackle_shop: 'Tackle Shop',
    charter: 'Charter',
    club: 'Club',
    guide: 'Guide',
  }

  const statusColors: Record<BusinessStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{business.name}</h3>
            {business.is_premium && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                <Crown size={12} />
                Premium
              </span>
            )}
            {business.is_featured && (
              <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                <Star size={12} />#{business.featured_position}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{typeLabels[business.type]}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColors[business.status]}`}>
          {business.status}
        </span>
      </div>

      {/* Details */}
      <div className="mb-4 space-y-1.5 text-sm text-gray-600">
        {business.address && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="line-clamp-1">{business.address}</span>
          </div>
        )}
        {business.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="flex-shrink-0" />
            <span>{business.phone}</span>
          </div>
        )}
        {business.website && (
          <div className="flex items-center gap-2">
            <Globe size={14} className="flex-shrink-0" />
            <a
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-navy-800 hover:underline"
            >
              <span className="line-clamp-1">{business.website}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {business.description && (
        <p className="mb-4 line-clamp-2 text-sm text-gray-700">{business.description}</p>
      )}

      {/* Rejection Reason */}
      {business.status === 'rejected' && business.rejection_reason && (
        <div className="mb-4 rounded-lg bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-800">Rejection Reason:</p>
          <p className="text-sm text-red-700">{business.rejection_reason}</p>
        </div>
      )}

      {/* Meta */}
      <div className="mb-4 flex items-center gap-3 text-xs text-gray-500">
        <span>Source: {business.source}</span>
        <span>•</span>
        <span>{formatDistanceToNow(new Date(business.created_at), { addSuffix: true })}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        {business.status === 'pending' && (
          <>
            <button
              onClick={onApprove}
              disabled={isApproving}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check size={16} />
              <span>{isApproving ? 'Approving...' : 'Approve'}</span>
            </button>
            <button
              onClick={() => {
                const reason = prompt('Reason for rejection:')
                if (reason) onReject(reason)
              }}
              disabled={isRejecting}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <X size={16} />
              <span>{isRejecting ? 'Rejecting...' : 'Reject'}</span>
            </button>
          </>
        )}

        {business.status === 'approved' && (
          <>
            {!business.is_premium && (
              <button
                onClick={() => {
                  const months = parseInt(prompt('Premium months (e.g. 12):') || '0')
                  const price = parseFloat(prompt('Price paid (£):') || '0')
                  if (months > 0) onSetPremium(months, price)
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                <Crown size={16} />
                <span>Set Premium</span>
              </button>
            )}
            {!business.is_featured && (
              <button
                onClick={() => {
                  const position = parseInt(prompt('Featured position (1-5):') || '0')
                  const days = parseInt(prompt('Featured days (e.g. 30):') || '0')
                  if (position > 0 && days > 0) onSetFeatured(position, days)
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-yellow-600 px-3 py-2 text-sm font-semibold text-white hover:bg-yellow-700"
              >
                <Star size={16} />
                <span>Feature</span>
              </button>
            )}
          </>
        )}

        {/* View on Map */}
        <a
          href={`https://www.google.com/maps?q=${business.lat},${business.lng}`}
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
