import { supabase } from "@/integrations/supabase/client";

/**
 * Manually sync subscription status from platform_subscriptions to profiles
 * This can be called if the trigger didn't fire or there was a delay
 * Uses Edge Function as fallback if client-side update fails (RLS issues)
 */
export async function syncSubscriptionToProfile(userId?: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const targetUserId = userId || session.user.id;
    const supabaseClient = supabase as any;

    // Get subscription from platform_subscriptions
    const { data: subscription, error: subError } = await supabaseClient
      .from("platform_subscriptions")
      .select("id, subscription_type, platform_plan_id")
      .eq("user_id", targetUserId)
      .maybeSingle() as {
        data: { id: string; subscription_type: string; platform_plan_id: string | null } | null;
        error: any;
      };

    if (subError) {
      console.error("Error fetching subscription:", subError);
      // Try Edge Function as fallback
      return await syncViaEdgeFunction();
    }

    if (!subscription) {
      // No subscription found, set profile to free
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .update({
          platform_subscription_id: null,
          platform_subscription_type: "free",
          platform_subscription_plan_id: null,
        } as any)
        .eq("id", targetUserId);
      
      if (profileError) {
        console.error("Error updating profile:", profileError);
        // Try Edge Function as fallback
        return await syncViaEdgeFunction();
      }
      return true;
    }

    // Update profile with subscription data
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        platform_subscription_id: subscription.id,
        platform_subscription_type: subscription.subscription_type,
        platform_subscription_plan_id: subscription.platform_plan_id,
      } as any)
      .eq("id", targetUserId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Try Edge Function as fallback (bypasses RLS)
      return await syncViaEdgeFunction();
    }

    return true;
  } catch (error) {
    console.error("Error syncing subscription:", error);
    // Try Edge Function as fallback
    return await syncViaEdgeFunction();
  }
}

/**
 * Sync subscription via Edge Function (bypasses RLS issues)
 */
async function syncViaEdgeFunction(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-subscription', {
      method: 'POST',
    });

    if (error) {
      console.error('Edge Function sync error:', error);
      return false;
    }

    if (data?.error) {
      console.error('Edge Function returned error:', data.error);
      return false;
    }

    console.log('Subscription synced via Edge Function:', data);
    return true;
  } catch (error) {
    console.error('Error calling sync-subscription Edge Function:', error);
    return false;
  }
}

