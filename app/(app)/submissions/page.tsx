import { redirect } from "next/navigation";
import SubmissionsPage from "@/views/Submissions";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

export default async function SubmissionsRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  return <SubmissionsPage />;
}


