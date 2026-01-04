// @ts-nocheck
// Deno runtime provides these globals - TypeScript errors are false positives

// ============================================
// CLEAN STRIPE WEBHOOK HANDLER
// ============================================
// Handles Stripe webhook events for both Platform and Widget subscriptions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Verify webhook signature first (before any other checks)
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Stripe
    const Stripe = (await import('https://esm.sh/stripe@14.21.0?target=deno')).default;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Missing Stripe configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' });

    // Initialize Supabase admin client (using service role to bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read body and verify webhook signature (async version for Deno)
    const body = await req.text();
    
    try {
      const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

      console.log(`Processing webhook event: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(stripe, supabase, event.data.object);
          break;

        case 'customer.subscription.created':
          console.log('Processing customer.subscription.created:', event.data.object.id);
          await handleSubscriptionUpdated(stripe, supabase, event.data.object);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(stripe, supabase, event.data.object);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(stripe, supabase, event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (sigError: any) {
      console.error('Webhook signature verification failed:', sigError.message);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: error.message?.includes('signature') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================
// HANDLE CHECKOUT SESSION COMPLETED
// ============================================
async function handleCheckoutCompleted(stripe: any, supabase: any, session: any) {
  console.log('Processing checkout.session.completed:', {
    sessionId: session.id,
    subscriptionId: session.subscription,
    metadata: session.metadata,
    paymentStatus: session.payment_status,
  });

  // Get subscription details from Stripe
  let subscription = null;
  if (session.subscription) {
    try {
      subscription = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;
      console.log('Retrieved subscription:', {
        id: subscription.id,
        status: subscription.status,
        customer: subscription.customer,
      });
    } catch (error: any) {
      console.error('Error retrieving subscription:', error);
      return;
    }
  } else {
    console.error('No subscription found in checkout session');
    return;
  }

  const userId = session.metadata?.userId || session.client_reference_id;
  const subscriptionType = session.metadata?.subscriptionType || 'platform';
  const planId = session.metadata?.planId;
  const planName = session.metadata?.planName;

  console.log('Checkout metadata:', {
    userId,
    subscriptionType,
    planId,
    planName,
  });

  if (!userId) {
    console.error('No userId found in checkout session metadata or client_reference_id');
    console.error('Session metadata:', session.metadata);
    console.error('Client reference ID:', session.client_reference_id);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const subscriptionId = subscription.id;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  console.log('Subscription details:', {
    priceId,
    subscriptionId,
    customerId,
    status: subscription.status,
  });

  // Process subscription even if status is not 'active' (could be trialing, etc.)
  // We'll mark is_active based on status
  if (subscriptionType === 'widget') {
    await updateWidgetSubscription(supabase, userId, subscription, priceId, subscriptionId, customerId);
  } else {
    await updatePlatformSubscription(supabase, userId, subscription, priceId, subscriptionId, customerId, planId);
  }
}

// ============================================
// HANDLE SUBSCRIPTION UPDATED
// ============================================
async function handleSubscriptionUpdated(stripe: any, supabase: any, subscription: any) {
  console.log('Processing customer.subscription.updated:', {
    subscriptionId: subscription.id,
    status: subscription.status,
    customer: subscription.customer,
  });

  // Process all subscription statuses, not just active
  // We'll mark is_active based on status in updatePlatformSubscription

  // Find user by customer_id in platform_subscriptions or widget_subscriptions
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const priceId = subscription.items.data[0]?.price?.id;

  // Check platform subscriptions first
  const { data: platformSub } = await supabase
    .from('platform_subscriptions')
    .select('user_id, id, platform_plan_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (platformSub) {
    // Use existing plan_id or find by price_id
    let planId = platformSub.platform_plan_id;
    if (!planId && priceId) {
      const { data: plan } = await supabase
        .from('platform_plans')
        .select('id')
        .eq('stripe_price_id', priceId)
        .maybeSingle();
      planId = plan?.id || null;
    }
    await updatePlatformSubscription(supabase, platformSub.user_id, subscription, priceId, subscription.id, customerId, planId);
    return;
  }

  // Check widget subscriptions
  const { data: widgetSub } = await supabase
    .from('widget_subscriptions')
    .select('user_id, id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (widgetSub) {
    await updateWidgetSubscription(supabase, widgetSub.user_id, subscription, priceId, subscription.id, customerId);
  }
}

// ============================================
// HANDLE SUBSCRIPTION DELETED
// ============================================
async function handleSubscriptionDeleted(stripe: any, supabase: any, subscription: any) {
  console.log('Processing customer.subscription.deleted:', subscription.id);

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  // Find and deactivate platform subscription
  const { data: platformSub } = await supabase
    .from('platform_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (platformSub) {
    await supabase
      .from('platform_subscriptions')
      .update({
        is_active: false,
        subscription_type: 'free',
        platform_plan_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
      })
      .eq('user_id', platformSub.user_id);
  }

  // Find and deactivate widget subscription
  const { data: widgetSub } = await supabase
    .from('widget_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (widgetSub) {
    await supabase
      .from('widget_subscriptions')
      .update({
        is_active: false,
        subscription_type: 'free',
        stripe_subscription_id: null,
        stripe_price_id: null,
      })
      .eq('user_id', widgetSub.user_id);
  }
}

// ============================================
// UPDATE PLATFORM SUBSCRIPTION
// ============================================
async function updatePlatformSubscription(
  supabase: any,
  userId: string,
  subscription: any,
  priceId: string,
  subscriptionId: string,
  customerId: string,
  planId: string | null
) {
  console.log('Updating platform subscription:', { userId, priceId, subscriptionId, planId });

  // Step 1: Fetch plan details from platform_plans table
  let planData: any = null;
  let finalPlanId = planId;

  // If planId provided, fetch plan by ID
  if (planId) {
    const { data: plan, error: planError } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();
    
    if (planError) {
      console.error('Error fetching plan by ID:', planError);
    } else if (plan) {
      planData = plan;
      finalPlanId = plan.id;
    }
  }

  // If plan not found by ID, try to find by stripe_price_id
  if (!planData && priceId) {
    const { data: plan, error: planError } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('stripe_price_id', priceId)
      .maybeSingle();
    
    if (planError) {
      console.error('Error fetching plan by price_id:', planError);
    } else if (plan) {
      planData = plan;
      finalPlanId = plan.id;
    }
  }

  if (planData) {
    console.log('Found plan in platform_plans:', {
      id: planData.id,
      name: planData.name,
      billing_cycle: planData.billing_cycle,
      price_cents: planData.price_cents,
    });
  } else {
    console.warn('Plan not found in platform_plans table, using defaults');
  }

  // Step 2: Prepare subscription data with plan information
  const billingCycle = planData?.billing_cycle || 
    subscription.items.data[0]?.price?.recurring?.interval || 
    'monthly';

  // Determine if subscription is active (active, trialing, or past_due are considered active)
  const isActive = ['active', 'trialing', 'past_due'].includes(subscription.status);
  const subscriptionType = isActive ? 'premium' : 'free';

  console.log('Subscription status:', {
    status: subscription.status,
    isActive,
    subscriptionType,
  });

  const updateData: any = {
    subscription_type: subscriptionType,
    platform_plan_id: finalPlanId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    stripe_customer_id: customerId,
    billing_cycle: billingCycle,
    is_active: isActive,
    current_period_end: subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  };

  console.log('Prepared update data:', updateData);

  // Step 3: Create/Update platform_subscriptions
  const { error } = await supabase
    .from('platform_subscriptions')
    .upsert({
      user_id: userId,
      ...updateData,
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error updating platform subscription:', error);
    throw error;
  }

  console.log('Platform subscription updated successfully:', {
    userId,
    planId: finalPlanId,
    subscriptionType: 'premium',
    billingCycle,
  });

  // Step 4: Profile is automatically updated via database trigger
  // But we can also do a direct update as fallback to ensure it's synced
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      platform_subscription_type: updateData.subscription_type,
      platform_subscription_plan_id: finalPlanId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    console.warn('Profile update failed (trigger should handle it):', profileError);
  } else {
    console.log('Profile updated directly as fallback:', {
      subscription_type: updateData.subscription_type,
      plan_id: finalPlanId,
    });
  }
}

// ============================================
// UPDATE WIDGET SUBSCRIPTION
// ============================================
async function updateWidgetSubscription(
  supabase: any,
  userId: string,
  subscription: any,
  priceId: string,
  subscriptionId: string,
  customerId: string
) {
  console.log('Updating widget subscription:', { userId, priceId, subscriptionId });

  // Determine widget plan type from price ID
  let widgetPlanType = 'plan1';
  let siteLimit = 1;

  if (priceId) {
    if (priceId.includes('plan2') || priceId.includes('widget-plan2')) {
      widgetPlanType = 'plan2';
      siteLimit = 3;
    } else if (priceId.includes('plan3') || priceId.includes('widget-plan3')) {
      widgetPlanType = 'plan3';
      siteLimit = 999999;
    }
  }

  const updateData: any = {
    subscription_type: widgetPlanType,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    stripe_customer_id: customerId,
    billing_cycle: subscription.items.data[0]?.price?.recurring?.interval || 'monthly',
    is_active: subscription.status === 'active',
    site_limit: siteLimit,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  };

  // Upsert subscription
  const { data: subscriptionData, error } = await supabase
    .from('widget_subscriptions')
    .upsert({
      user_id: userId,
      ...updateData,
    }, {
      onConflict: 'user_id',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error updating widget subscription:', error);
    throw error;
  }

  console.log('Widget subscription updated successfully');

  // Manually update profile as fallback (trigger should handle this, but we do it manually too)
  if (subscriptionData?.id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        widget_subscription_id: subscriptionData.id,
        widget_subscription_type: widgetPlanType,
        widget_site_limit: siteLimit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('Profile sync failed (trigger should handle it):', profileError);
    } else {
      console.log('Profile synced with widget subscription');
    }
  }
}
