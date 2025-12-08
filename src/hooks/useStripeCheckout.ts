import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getStripe, STRIPE_PRODUCTS } from '../lib/stripe'
import { toast } from 'react-hot-toast'

interface CheckoutOptions {
  productType: 'lake_premium'
  targetId: string
  billingInterval: 'monthly' | 'yearly'
}

export function useStripeCheckout() {
  return useMutation({
    mutationFn: async (options: CheckoutOptions) => {
      const { productType, targetId, billingInterval } = options

      // Get the price ID based on product and interval
      const priceId = billingInterval === 'yearly' 
        ? STRIPE_PRODUCTS.LAKE_PREMIUM_YEARLY 
        : STRIPE_PRODUCTS.LAKE_PREMIUM_MONTHLY

      if (!priceId) {
        throw new Error('Stripe product not configured')
      }

      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Please log in to continue')
      }

      // Call the Edge Function to create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          productType,
          targetId,
          billingInterval,
          successUrl: `${window.location.origin}/lakes/${targetId}?upgrade=success`,
          cancelUrl: `${window.location.origin}/lakes/${targetId}?upgrade=canceled`,
        },
      })

      if (error) {
        throw new Error(error.message || 'Failed to create checkout session')
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start checkout')
    },
  })
}

// Hook to manage subscription (cancel, update, etc.)
export function useManageSubscription() {
  return useMutation({
    mutationFn: async (lakeId: string) => {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Please log in to continue')
      }

      // Call Edge Function to create customer portal session
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { lakeId },
      })

      if (error) {
        throw new Error(error.message || 'Failed to open billing portal')
      }

      if (!data?.url) {
        throw new Error('No portal URL returned')
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to open billing portal')
    },
  })
}

// Hook to check subscription status
export function useSubscriptionStatus(lakeId: string | undefined) {
  // This could be a query, but for now we'll rely on the lake's is_premium field
  // which is updated by webhooks
  return null
}
