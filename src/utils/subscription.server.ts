import { createServerSupabaseClient } from "@/integrations/supabase/server";

export async function getPlatformSubscriptionServer(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("platform_subscriptions")
    .select(
      "id, user_id, subscription_type, platform_plan_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_cycle, is_active, current_period_end, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Server: error fetching platform subscription", error);
    return null;
  }

  return data;
}

export async function getWidgetSubscriptionServer(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("widget_subscriptions")
    .select(
      "id, user_id, subscription_type, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_cycle, is_active, site_limit, current_period_end, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Server: error fetching widget subscription", error);
    return null;
  }

  return data;
}


