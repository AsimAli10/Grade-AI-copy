// ============================================
// CLEAN STRIPE UTILITIES
// ============================================

import { supabase } from "@/integrations/supabase/client";
import { getUrl } from "./url";

/**
 * Create checkout session for platform or widget subscription
 */
export async function createCheckoutSession(
  priceId: string,
  billingCycle: 'monthly' | 'yearly',
  subscriptionType: 'platform' | 'widget' = 'platform',
  planId?: string,
  planName?: string
): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    throw new Error('User not authenticated');
  }

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : getUrl("");
  const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=${subscriptionType}`;
  const cancelUrl = origin + "/dashboard?checkout=cancelled";

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      priceId,
      billingCycle,
      subscriptionType,
      planId,
      planName,
      successUrl,
      cancelUrl,
    },
  });

  if (error) {
    console.error('Error creating checkout session:', error);
    throw new Error(error.message || 'Failed to create checkout session');
  }

  if (!data?.url) {
    throw new Error('No checkout URL returned');
  }

  return data.url;
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(checkoutUrl: string): Promise<void> {
  window.location.href = checkoutUrl;
}
