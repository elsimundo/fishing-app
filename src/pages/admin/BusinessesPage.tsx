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
  Plus,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

type BusinessType = 'tackle_shop' | 'charter' | 'club' | 'guide'
type BusinessStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
type BusinessFilter = 'all' | 'pending' | 'approved' | 'premium' | 'featured' | 'pending_claims'

interface BusinessClaim {
  id: string
  business_id: string
  user_id: string
  relationship: string
  proof_notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  business?: {
    id: string
    name: string
    type: string
    address: string | null
  }
  user?: {
    id: string
    username: string | null
    email: string | null
  }
}

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
  claimed_by: string | null
}

export default function BusinessesPage() {
  const { user } = useAdminAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<BusinessFilter>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Fetch businesses
  const { data: businesses, isLoading } = useQuery({
    queryKey: ['admin-businesses', filter, searchTerm],
    queryFn: async () => {
      // Skip if on claims tab
      if (filter === 'pending_claims') return []

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

  // Fetch pending business claims
  const { data: pendingClaims, isLoading: claimsLoading } = useQuery({
    queryKey: ['admin-business-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_claims')
        .select(`
          *,
          business:businesses(id, name, type, address),
          user:profiles(id, username, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as BusinessClaim[]
    },
  })

  // Approve business
  const approve = useMutation({
    mutationFn: async ({ businessId, businessName, ownerId }: { businessId: string; businessName: string; ownerId: string | null }) => {
      const { error } = await supabase.rpc('approve_business', {
        p_business_id: businessId,
        p_admin_id: user?.id,
      })
      if (error) throw error

      // Send notification to owner if exists
      if (ownerId) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          type: 'business_approved',
          title: 'Business Approved!',
          message: `Your business "${businessName}" has been approved and is now visible to anglers.`,
          action_url: `/explore`,
        })
      }
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
    mutationFn: async ({ businessId, businessName, ownerId, reason }: { businessId: string; businessName: string; ownerId: string | null; reason: string }) => {
      const { error } = await supabase.rpc('reject_business', {
        p_business_id: businessId,
        p_admin_id: user?.id,
        p_reason: reason,
      })
      if (error) throw error

      // Send notification to owner if exists
      if (ownerId) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          type: 'business_rejected',
          title: 'Business Not Approved',
          message: reason 
            ? `Your business "${businessName}" was not approved: ${reason}`
            : `Your business "${businessName}" was not approved. Please contact support for more information.`,
          action_url: null,
        })
      }
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

  // Approve business claim
  const approveClaim = useMutation({
    mutationFn: async ({ claimId, userId, businessName }: { claimId: string; userId: string; businessName: string }) => {
      const { error } = await supabase.rpc('approve_business_claim', {
        p_claim_id: claimId,
        p_reviewer_id: user?.id,
        p_action: 'approve',
      })
      if (error) throw error

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'business_claim_approved',
        title: 'Claim Approved!',
        message: `Your claim for "${businessName}" has been approved. You can now manage your business listing.`,
        action_url: `/explore`,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-claims'] })
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] })
      toast.success('Claim approved')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Reject business claim
  const rejectClaim = useMutation({
    mutationFn: async ({ claimId, userId, businessName, reason }: { claimId: string; userId: string; businessName: string; reason: string | null }) => {
      const { error } = await supabase.rpc('approve_business_claim', {
        p_claim_id: claimId,
        p_reviewer_id: user?.id,
        p_action: 'reject',
      })
      if (error) throw error

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'business_claim_rejected',
        title: 'Claim Not Approved',
        message: reason
          ? `Your claim for "${businessName}" was not approved: ${reason}`
          : `Your claim for "${businessName}" was not approved. Please contact support for more information.`,
        action_url: null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-claims'] })
      toast.success('Claim rejected')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const pendingClaimsCount = pendingClaims?.length ?? 0

  const filters: { value: BusinessFilter; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'pending_claims', label: `Claims${pendingClaimsCount > 0 ? ` (${pendingClaimsCount})` : ''}` },
    { value: 'approved', label: 'Approved' },
    { value: 'premium', label: 'Premium' },
    { value: 'featured', label: 'Featured' },
    { value: 'all', label: 'All' },
  ]

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Businesses</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900"
            >
              <Plus size={18} />
              Add Business
            </button>
          </div>

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
                placeholder="Search..."
                className="w-full rounded-lg border-2 border-border bg-background text-foreground py-2 pl-10 pr-4 text-sm focus:border-navy-800 focus:outline-none sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Pending Claims View */}
        {filter === 'pending_claims' ? (
          claimsLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : pendingClaims && pendingClaims.length > 0 ? (
            <div className="space-y-4">
              {pendingClaims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  onApprove={() => {
                    const business = Array.isArray(claim.business) ? claim.business[0] : claim.business
                    approveClaim.mutate({
                      claimId: claim.id,
                      userId: claim.user_id,
                      businessName: business?.name || 'Unknown Business',
                    })
                  }}
                  onReject={(reason) => {
                    const business = Array.isArray(claim.business) ? claim.business[0] : claim.business
                    rejectClaim.mutate({
                      claimId: claim.id,
                      userId: claim.user_id,
                      businessName: business?.name || 'Unknown Business',
                      reason,
                    })
                  }}
                  isApproving={approveClaim.isPending}
                  isRejecting={rejectClaim.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-muted p-6 text-muted-foreground">
              <Check size={20} className="text-green-500" />
              <span>No pending claims to review</span>
            </div>
          )
        ) : (
          /* Businesses Grid */
          isLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : businesses && businesses.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {businesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onApprove={() => approve.mutate({ businessId: business.id, businessName: business.name, ownerId: business.claimed_by })}
                  onReject={(reason) => reject.mutate({ businessId: business.id, businessName: business.name, ownerId: business.claimed_by, reason })}
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
            <div className="flex items-center gap-2 rounded-xl bg-muted p-6 text-muted-foreground">
              <AlertCircle size={20} />
              <span>No businesses found for this filter</span>
            </div>
          )
        )}

        {/* Add Business Modal */}
        {showAddModal && (
          <AddBusinessModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false)
              queryClient.invalidateQueries({ queryKey: ['admin-businesses'] })
            }}
          />
        )}
      </div>
    </AdminLayout>
  )
}

function AddBusinessModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<BusinessType>('tackle_shop')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!lat || !lng) {
      toast.error('Latitude and longitude are required')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('businesses').insert({
        name: name.trim(),
        type,
        address: address.trim() || null,
        city: city.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        source: 'admin',
        status: 'approved',
      })

      if (error) throw error

      toast.success('Business added successfully')
      onSuccess()
    } catch (error: any) {
      console.error('Failed to add business:', error)
      toast.error(error?.message || 'Failed to add business')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Add Business</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-muted"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Business Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
              placeholder="e.g. Bob's Tackle Shop"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BusinessType)}
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
            >
              <option value="tackle_shop">Tackle Shop</option>
              <option value="charter">Charter</option>
              <option value="club">Club</option>
              <option value="guide">Guide</option>
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
              placeholder="123 High Street"
            />
          </div>

          {/* City */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
              placeholder="London"
            />
          </div>

          {/* Lat/Lng */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                placeholder="51.5074"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                placeholder="-0.1278"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
              placeholder="+44 20 1234 5678"
            />
          </div>

          {/* Website */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
              placeholder="https://example.com"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
              placeholder="Brief description of the business..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
            >
              {isSubmitting ? 'Adding...' : 'Add Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
    suspended: 'bg-muted text-muted-foreground border border-border',
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:p-6">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">{business.name}</h3>
            {business.is_premium && (
              <span className="flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-xs font-semibold text-purple-400">
                <Crown size={12} />
                Premium
              </span>
            )}
            {business.is_featured && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-400">
                <Star size={12} />#{business.featured_position}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{typeLabels[business.type]}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColors[business.status]}`}>
          {business.status}
        </span>
      </div>

      {/* Details */}
      <div className="mb-4 space-y-1.5 text-sm text-muted-foreground">
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
        <p className="mb-4 line-clamp-2 text-sm text-foreground">{business.description}</p>
      )}

      {/* Rejection Reason */}
      {business.status === 'rejected' && business.rejection_reason && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-xs font-semibold text-red-400">Rejection Reason:</p>
          <p className="text-sm text-red-300">{business.rejection_reason}</p>
        </div>
      )}

      {/* Meta */}
      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span>Source: {business.source}</span>
        <span>•</span>
        <span>{formatDistanceToNow(new Date(business.created_at), { addSuffix: true })}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
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
          className="flex items-center justify-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/80"
        >
          <MapPin size={16} />
          <span>Map</span>
        </a>
      </div>
    </div>
  )
}

function ClaimCard({
  claim,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  claim: BusinessClaim
  onApprove: () => void
  onReject: (reason: string | null) => void
  isApproving: boolean
  isRejecting: boolean
}) {
  const business = Array.isArray(claim.business) ? claim.business[0] : claim.business
  const user = Array.isArray(claim.user) ? claim.user[0] : claim.user

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{business?.name || 'Unknown Business'}</h3>
          <p className="text-sm text-muted-foreground">{business?.type || 'business'} • {business?.address || 'No address'}</p>
          
          <div className="mt-3 space-y-1 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Claimant:</strong>{' '}
              {user?.username || user?.email || 'Unknown User'}
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Relationship:</strong>{' '}
              {claim.relationship}
            </p>
            {claim.proof_notes && (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Notes:</strong>{' '}
                {claim.proof_notes}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Submitted {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onApprove}
            disabled={isApproving || isRejecting}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Check size={14} />
            {isApproving ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={() => {
              const reason = prompt('Reason for rejection (optional):')
              onReject(reason)
            }}
            disabled={isApproving || isRejecting}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <X size={14} />
            {isRejecting ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}
