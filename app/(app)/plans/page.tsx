import { redirect } from "next/navigation";
import PlansPage from "@/views/Plans";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";
import { fetchActivePlatformPlansServer } from "@/utils/plans.server";

export default async function PlansRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const user = session.user;

  const plans = await fetchActivePlatformPlansServer();
  const subscription = await getPlatformSubscriptionServer(user.id);

  return (
    <PlansPage
      initialUser={user}
      initialPlans={plans}
      initialSubscription={subscription}
    />
  );
}

