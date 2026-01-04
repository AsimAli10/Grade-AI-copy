import { redirect } from "next/navigation";
import ForumsPage from "@/views/Forums";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

export default async function ForumsRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  return <ForumsPage />;
}


