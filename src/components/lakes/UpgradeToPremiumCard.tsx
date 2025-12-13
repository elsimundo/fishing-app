import { useState } from 'react'
import { Crown, Check, Loader2 } from 'lucide-react'
import { useStripeCheckout, useManageSubscription } from '../../hooks/useStripeCheckout'
import { PRICING } from '../../lib/stripe'

interface UpgradeToPremiumCardProps {
  lakeId: string
  lakeName: string
  isPremium: boolean
  premiumExpiresAt?: string | null
}

export function UpgradeToPremiumCard({ 
  lakeId, 
  lakeName, 
  isPremium, 
  premiumExpiresAt 
}: UpgradeToPremiumCardProps) {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly')
  const checkout = useStripeCheckout()
  const manageSubscription = useManageSubscription()

  const pricing = PRICING.LAKE_PREMIUM

  const handleUpgrade = () => {
    checkout.mutate({
      productType: 'lake_premium',
      targetId: lakeId,
      billingInterval,
    })
  }

  const handleManage = () => {
    manageSubscription.mutate(lakeId)
  }

  if (isPremium) {
    return (
      <div className="rounded-xl border-2 border-amber-500/40 bg-amber-900/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-900/50">
            <Crown size={24} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Premium Active</h3>
            <p className="text-sm text-gray-400">{lakeName}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check size={16} className="text-emerald-400" />
            Featured placement in search
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check size={16} className="text-emerald-400" />
            Analytics dashboard
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check size={16} className="text-emerald-400" />
            Photo gallery
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check size={16} className="text-emerald-400" />
            Priority support
          </div>
        </div>

        {premiumExpiresAt && (
          <p className="text-xs text-gray-500 mb-4">
            Renews on {new Date(premiumExpiresAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}

        <button
          type="button"
          onClick={handleManage}
          disabled={manageSubscription.isPending}
          className="w-full rounded-lg border border-[#334155] bg-[#1A2D3D] py-2 text-sm font-medium text-gray-300 hover:bg-[#334155] disabled:opacity-50"
        >
          {manageSubscription.isPending ? (
            <Loader2 size={16} className="inline animate-spin mr-2" />
          ) : null}
          Manage Subscription
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-[#334155] bg-[#243B4A] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500">
          <Crown size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Upgrade to Premium</h3>
          <p className="text-sm text-gray-400">Unlock all features for {lakeName}</p>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex rounded-lg bg-[#1A2D3D] p-1 mb-6">
        <button
          type="button"
          onClick={() => setBillingInterval('monthly')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            billingInterval === 'monthly'
              ? 'bg-[#334155] text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBillingInterval('yearly')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            billingInterval === 'yearly'
              ? 'bg-[#334155] text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Yearly
          <span className="ml-1 rounded bg-emerald-900/30 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
            Save {pricing.yearly.savings}
          </span>
        </button>
      </div>

      {/* Price display */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold text-white">
            £{billingInterval === 'yearly' ? pricing.yearly.amount : pricing.monthly.amount}
          </span>
          <span className="text-gray-500">
            /{billingInterval === 'yearly' ? 'year' : 'month'}
          </span>
        </div>
        {billingInterval === 'yearly' && (
          <p className="text-xs text-gray-500 mt-1">
            That's just £{(pricing.yearly.amount / 12).toFixed(2)}/month
          </p>
        )}
      </div>

      {/* Features */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Check size={16} className="text-emerald-400" />
          Featured placement in search results
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Check size={16} className="text-emerald-400" />
          Full analytics dashboard
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Check size={16} className="text-emerald-400" />
          Photo gallery (up to 20 photos)
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Check size={16} className="text-emerald-400" />
          Booking link integration
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Check size={16} className="text-emerald-400" />
          Remove competitor ads
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Check size={16} className="text-emerald-400" />
          Priority support
        </div>
      </div>

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={checkout.isPending}
        className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 py-3 text-sm font-semibold text-white shadow-sm hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50"
      >
        {checkout.isPending ? (
          <>
            <Loader2 size={16} className="inline animate-spin mr-2" />
            Redirecting to checkout...
          </>
        ) : (
          <>
            <Crown size={16} className="inline mr-2" />
            Upgrade Now
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-gray-500 mt-3">
        Cancel anytime. Secure payment via Stripe.
      </p>
    </div>
  )
}
