import { redirect } from "next/navigation";
import DashboardPage from "@/views/Dashboard";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";

export default async function DashboardRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const user = session.user;

  const subscription = await getPlatformSubscriptionServer(user.id);

  // Fetch user profile to get full_name
  let userFullName: string | null = null;
  try {
    const { data: profileData } = await (supabase as any)
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    
    if (profileData?.full_name) {
      userFullName = profileData.full_name.trim();
    }
  } catch (error) {
    console.error("Server: failed to load user profile", error);
  }

  return (
    <DashboardPage
      initialUser={user}
      initialSubscription={subscription}
      initialFullName={userFullName}
    />
  );
}

