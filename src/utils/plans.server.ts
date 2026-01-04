import { createServerSupabaseClient } from "@/integrations/supabase/server";

export async function fetchActivePlatformPlansServer() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("platform_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_cents", { ascending: true });

  if (error) {
    console.error("Server: error fetching platform plans", error);
    return [];
  }

  return data ?? [];
}


