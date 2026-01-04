import { createServerSupabaseClient } from "@/integrations/supabase/server";
import {
  getPlatformSubscriptionServer,
} from "@/utils/subscription.server";

export async function fetchProfileDataServer(userId: string) {
  const supabase = createServerSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Server: error fetching profile", profileError);
  }

  const subscription = (await getPlatformSubscriptionServer(userId)) as
    | {
        platform_plan_id?: string | null;
        subscription_type?: string | null;
      }
    | null;

  let planName: string | null = null;
  // Only fetch plan name if subscription is premium and has platform_plan_id
  if (subscription?.subscription_type === "premium" && subscription?.platform_plan_id) {
    const { data: planRow, error: planError } = await supabase
      .from("platform_plans")
      .select("name")
      .eq("id", subscription.platform_plan_id)
      .maybeSingle();

    if (planError) {
      console.error("Server: error fetching platform plan name", planError);
    }

    const planRecord = (planRow as { name?: string | null } | null);
    planName = planRecord?.name ?? null;
  }

  return {
    profile: profile ?? null,
    subscription: subscription ?? null,
    planName,
  };
}


