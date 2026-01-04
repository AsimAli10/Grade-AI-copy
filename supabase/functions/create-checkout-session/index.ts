// @ts-nocheck
// Deno runtime provides these globals - TypeScript errors are false positives

// ============================================
// CLEAN CHECKOUT SESSION CREATOR
// ============================================
// Creates Stripe checkout sessions for Platform and Widget subscriptions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const body = await req.json();
    const {
      priceId,
      billingCycle,
      subscriptionType = 'platform',
      planId,
      planName,
      successUrl,
      cancelUrl,
    } = body;

    if (!priceId) {
      throw new Error('Missing priceId');
    }

    // Initialize Stripe
    const Stripe = (await import('https://esm.sh/stripe@14.21.0?target=deno')).default;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      success_url: successUrl || `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/plans`,
      metadata: {
        userId: user.id,
        subscriptionType,
        planId: planId || '',
        planName: planName || '',
        billingCycle: billingCycle || 'monthly',
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
