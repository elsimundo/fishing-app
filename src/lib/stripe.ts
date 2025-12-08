import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Stripe public key from environment
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!stripePublicKey) {
    console.error('VITE_STRIPE_PUBLIC_KEY not found in environment variables')
    return Promise.resolve(null)
  }
  
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublicKey)
  }
  
  return stripePromise
}

// Product IDs - these should match your Stripe dashboard
export const STRIPE_PRODUCTS = {
  LAKE_PREMIUM_MONTHLY: import.meta.env.VITE_STRIPE_LAKE_PREMIUM_MONTHLY as string,
  LAKE_PREMIUM_YEARLY: import.meta.env.VITE_STRIPE_LAKE_PREMIUM_YEARLY as string,
} as const

// Pricing display (for UI, actual prices come from Stripe)
export const PRICING = {
  LAKE_PREMIUM: {
    monthly: { amount: 9.99, currency: 'GBP', interval: 'month' as const },
    yearly: { amount: 99, currency: 'GBP', interval: 'year' as const, savings: '17%' },
  },
} as const
