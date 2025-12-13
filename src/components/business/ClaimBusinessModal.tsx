import { useState } from 'react'
import { Loader2, Store, Users, Anchor, X, Mail, FileText, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'react-hot-toast'
import type { BusinessFromDB } from '../../hooks/useTackleShops'

interface ClaimBusinessModalProps {
  business: BusinessFromDB
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  tackle_shop: 'Tackle Shop',
  club: 'Fishing Club',
  charter: 'Charter Boat',
  guide: 'Fishing Guide',
}

const TYPE_ICONS: Record<string, typeof Store> = {
  tackle_shop: Store,
  club: Users,
  charter: Anchor,
  guide: Users,
}

export function ClaimBusinessModal({ business, onClose }: ClaimBusinessModalProps) {
  const { user } = useAuth()
  const [relationship, setRelationship] = useState('owner')
  const [email, setEmail] = useState(user?.email || '')
  const [proofNotes, setProofNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please log in to claim a business')
      return
    }

    if (!email.trim()) {
      toast.error('Please add a contact email')
      return
    }

    setIsSubmitting(true)
    try {
      // Business already exists in DB (synced from OSM), just create the claim
      const { error: claimError } = await supabase.from('business_claims').insert({
        business_id: business.id,
        user_id: user.id,
        relationship,
        proof_notes: proofNotes.trim() || null,
      })

      if (claimError) throw claimError

      toast.success('Claim submitted for review')
      onClose()
    } catch (error: any) {
      console.error('Failed to submit business claim', error)
      toast.error(error?.message || 'Failed to submit claim')
    } finally {
      setIsSubmitting(false)
    }
  }

  const Icon = TYPE_ICONS[business.type] || Store

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#243B4A] border border-[#334155] p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Claim this business?</h2>
            <p className="mt-1 text-xs text-gray-400">
              Tell us how you&apos;re connected to this place so we can verify your ownership and give you
              control of the listing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-1 hover:bg-[#334155] disabled:opacity-50"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Business summary */}
        <div className="mb-4 rounded-xl bg-[#1A2D3D] p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-900/30">
              <Icon size={18} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{business.name}</p>
              <p className="text-[10px] text-gray-500">{TYPE_LABELS[business.type] || 'Business'}</p>
              {business.address && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                  <MapPin size={10} />
                  <span className="line-clamp-1">{business.address}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Relationship */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Your role</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full rounded-xl border border-[#334155] bg-[#1A2D3D] px-3 py-2 text-sm text-white focus:border-[#1BA9A0] focus:outline-none focus:ring-2 focus:ring-[#1BA9A0]/20"
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Contact email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1A2D3D] py-2 pl-9 pr-3 text-sm text-white focus:border-[#1BA9A0] focus:outline-none focus:ring-2 focus:ring-[#1BA9A0]/20"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Proof notes */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              <span className="inline-flex items-center gap-1">
                <FileText size={12} />
                Proof / extra details
              </span>
            </label>
            <textarea
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-[#334155] bg-[#1A2D3D] px-3 py-2 text-sm text-white focus:border-[#1BA9A0] focus:outline-none focus:ring-2 focus:ring-[#1BA9A0]/20"
              placeholder="Example: I am the owner; my name is on the website and utility bills."
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-[#334155] bg-[#1A2D3D] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#334155] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[#1BA9A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14B8A6] disabled:bg-[#334155]"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit claim'
              )}
            </button>
          </div>
        </form>

        <p className="mt-3 text-center text-[11px] text-gray-500">
          We may contact you for additional verification before approving your claim.
        </p>
      </div>
    </div>
  )
}
