// Supabase Edge Function: Handle Stripe Webhooks
// Deploy with: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Received Stripe event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Mark checkout session as completed
        await supabase
          .from('checkout_sessions')
          .update({ status: 'completed' })
          .eq('stripe_session_id', session.id)
        
        console.log('Checkout completed:', session.id)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const metadata = subscription.metadata
        
        const productType = metadata.product_type
        const targetId = metadata.target_id
        const userId = metadata.user_id

        // Upsert subscription record
        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          user_id: userId,
          status: subscription.status,
          price_id: subscription.items.data[0]?.price.id,
          product_type: productType,
          target_id: targetId,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at 
            ? new Date(subscription.canceled_at * 1000).toISOString() 
            : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'stripe_subscription_id',
        })

        // Update the target (lake) if subscription is active
        if (productType === 'lake_premium' && targetId) {
          const isActive = ['active', 'trialing'].includes(subscription.status)
          
          await supabase
            .from('lakes')
            .update({
              is_premium: isActive,
              stripe_subscription_id: subscription.id,
              premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
              premium_plan: subscription.items.data[0]?.price.recurring?.interval || 'monthly',
            })
            .eq('id', targetId)

          console.log(`Lake ${targetId} premium status: ${isActive}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const metadata = subscription.metadata
        
        const productType = metadata.product_type
        const targetId = metadata.target_id

        // Update subscription record
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        // Remove premium from lake
        if (productType === 'lake_premium' && targetId) {
          await supabase
            .from('lakes')
            .update({
              is_premium: false,
              stripe_subscription_id: null,
              premium_expires_at: null,
              premium_plan: null,
            })
            .eq('id', targetId)

          console.log(`Lake ${targetId} premium removed`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        
        if (subscriptionId) {
          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId)
        }
        
        console.log('Payment failed for subscription:', subscriptionId)
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Webhook handler failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
