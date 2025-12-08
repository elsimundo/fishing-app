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
      <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <Crown size={24} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Premium Active</h3>
            <p className="text-sm text-gray-600">{lakeName}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check size={16} className="text-green-600" />
            Featured placement in search
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check size={16} className="text-green-600" />
            Analytics dashboard
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check size={16} className="text-green-600" />
            Photo gallery
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check size={16} className="text-green-600" />
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
          className="w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
    <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500">
          <Crown size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Upgrade to Premium</h3>
          <p className="text-sm text-gray-600">Unlock all features for {lakeName}</p>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
        <button
          type="button"
          onClick={() => setBillingInterval('monthly')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            billingInterval === 'monthly'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBillingInterval('yearly')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            billingInterval === 'yearly'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Yearly
          <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
            Save {pricing.yearly.savings}
          </span>
        </button>
      </div>

      {/* Price display */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold text-gray-900">
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
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Check size={16} className="text-green-600" />
          Featured placement in search results
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Check size={16} className="text-green-600" />
          Full analytics dashboard
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Check size={16} className="text-green-600" />
          Photo gallery (up to 20 photos)
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Check size={16} className="text-green-600" />
          Booking link integration
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Check size={16} className="text-green-600" />
          Remove competitor ads
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Check size={16} className="text-green-600" />
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

      <p className="text-center text-[10px] text-gray-400 mt-3">
        Cancel anytime. Secure payment via Stripe.
      </p>
    </div>
  )
}
