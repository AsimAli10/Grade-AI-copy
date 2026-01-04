// ============================================
// CLEAN SUBSCRIPTION UTILITIES
// ============================================

import { supabase } from "@/integrations/supabase/client";

type PlatformSubscriptionRow = {
  id: string;
  user_id: string;
  subscription_type: string | null;
  platform_plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  billing_cycle: string | null;
  is_active: boolean | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

type WidgetSubscriptionRow = {
  id: string;
  user_id: string;
  subscription_type: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  billing_cycle: string | null;
  is_active: boolean | null;
  site_limit: number | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

const supabaseClient = supabase as any;

/**
 * Get user's platform subscription
 */
export async function getPlatformSubscription(userId?: string): Promise<PlatformSubscriptionRow | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const targetUserId = userId || session.user.id;

    const { data, error } = await supabaseClient
      .from("platform_subscriptions")
      .select(
        "id, user_id, subscription_type, platform_plan_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_cycle, is_active, current_period_end, created_at, updated_at"
      )
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (error) {
      // Only log non-network errors (CORS/network errors are expected in some contexts)
      const errorMessage = error.message || String(error);
      const isNetworkError = 
        error.code === "PGRST116" ||
        errorMessage.includes("Load failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("TypeError");
      
      if (!isNetworkError) {
        console.error("Error fetching platform subscription:", error);
      }
      return null;
    }

    return (data || null) as PlatformSubscriptionRow | null;
  } catch (error: any) {
    // Only log non-network errors
    const errorMessage = error?.message || String(error) || "";
    const isNetworkError = 
      errorMessage.includes("Load failed") ||
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("NetworkError") ||
      errorMessage.includes("TypeError");
    
    if (!isNetworkError) {
      console.error("Error fetching platform subscription:", error);
    }
    return null;
  }
}

/**
 * Get user's widget subscription
 */
export async function getWidgetSubscription(userId?: string): Promise<WidgetSubscriptionRow | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const targetUserId = userId || session.user.id;

    const { data, error } = await supabaseClient
      .from("widget_subscriptions")
      .select(
        "id, user_id, subscription_type, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_cycle, is_active, site_limit, current_period_end, created_at, updated_at"
      )
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching widget subscription:", error);
      return null;
    }

    return (data || null) as WidgetSubscriptionRow | null;
  } catch (error) {
    console.error("Error fetching widget subscription:", error);
    return null;
  }
}

/**
 * Check if user has active premium platform subscription
 */
export async function hasActivePremiumSubscription(userId?: string): Promise<boolean> {
  const subscription = await getPlatformSubscription(userId);
  return subscription?.subscription_type === 'premium' && subscription?.is_active === true;
}

/**
 * Check if user has active widget subscription
 */
export async function hasActiveWidgetSubscription(userId?: string): Promise<boolean> {
  const subscription = await getWidgetSubscription(userId);
  return subscription?.subscription_type !== 'free' && subscription?.is_active === true;
}

