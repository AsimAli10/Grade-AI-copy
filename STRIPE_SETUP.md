# Stripe Subscription Setup Guide

This guide explains how to set up Stripe subscriptions for your WhatTheFood application.

## Prerequisites

1. **Stripe Account**: Create an account at [stripe.com](https://stripe.com)
2. **Stripe Products & Prices**: Create a product and price in your Stripe Dashboard
3. **Supabase Edge Functions** (recommended) or a backend API server

## Environment Variables

Add these environment variables to your `.env` file:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1SOxp7PO1jMh2jA4zdTfgcqW # Monthly Premium plan
VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID=price_1SOxp7PO1jMh2jA45lqLzOxN # Yearly Premium plan
```

**Note**: The plans page has fallback values for the price IDs, but it's recommended to set these environment variables.

**Stripe Product & Price IDs:**
- **Free Plan**: No Stripe price ID needed (handled directly in database)
- **Premium Monthly**: `price_1SOxp7PO1jMh2jA4zdTfgcqW` (Product: `prod_TLf9pFxLCzp9yt`)
- **Premium Yearly**: `price_1SOxp7PO1jMh2jA45lqLzOxN` (Product: `prod_TLf9pFxLCzp9yt`)

## Option 1: Supabase Edge Function (Recommended)

### Step 1: Create the Edge Function

Create a Supabase Edge Function named `create-checkout-session` in `supabase/functions/create-checkout-session/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    // Parse request body
    const { priceId, billingCycle, userId, email, successUrl, cancelUrl } = await req.json();

    // Create or retrieve Stripe customer
    let customerId: string;
    
    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // Store customer ID in database
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
        });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl.replace('{CHECKOUT_SESSION_ID}', '{CHECKOUT_SESSION_ID}'),
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        billingCycle: billingCycle,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});
```

### Step 2: Create Webhook Handler

Create another Edge Function `stripe-webhook` in `supabase/functions/stripe-webhook/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;

        if (userId) {
          // Update subscription in database
          await supabaseClient
            .from('subscriptions')
            .update({
              subscription_type: 'premium',
              stripe_subscription_id: session.subscription,
              stripe_price_id: session.line_items?.data[0]?.price?.id,
              billing_cycle: session.metadata?.billingCycle || 'monthly',
              is_active: true,
              current_period_end: new Date(session.expires_at * 1000).toISOString(),
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await supabaseClient
            .from('subscriptions')
            .update({
              is_active: subscription.status === 'active',
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
```

### Step 3: Set Up Edge Function Secrets

In your Supabase Dashboard, go to Edge Functions and set these secrets:

- `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_`)
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### Step 4: Deploy Edge Functions

```bash
# Deploy checkout session function
supabase functions deploy create-checkout-session

# Deploy webhook handler
supabase functions deploy stripe-webhook
```

### Step 5: Configure Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret and add it to your Edge Function secrets

## Option 2: Custom Backend API

If you prefer a custom backend, create API endpoints that:

1. **POST `/api/create-checkout-session`**:
   - Creates a Stripe customer (if needed)
   - Creates a Stripe Checkout Session
   - Returns the checkout URL

2. **POST `/api/stripe-webhook`**:
   - Handles Stripe webhook events
   - Updates subscription status in database

Update `src/utils/stripe.ts` to use your custom API URL instead of Supabase Edge Functions.

## Testing

1. Use Stripe test mode: `pk_test_...` for publishable key
2. Test with Stripe test cards: `4242 4242 4242 4242`
3. Verify subscription updates in your database after successful checkout
4. Test webhook events using Stripe Dashboard > Webhooks > Send test webhook

## Important Notes

- Never expose your Stripe secret key in client-side code
- Always verify webhook signatures
- Handle subscription cancellations and updates properly
- Set up proper error handling and user feedback
- Test thoroughly in Stripe test mode before going live

