import { redirect } from "next/navigation";
import AssignmentsPage from "@/views/Assignments";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

export default async function AssignmentsRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  return <AssignmentsPage />;
}


