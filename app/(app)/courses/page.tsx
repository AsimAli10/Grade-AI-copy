import { redirect } from "next/navigation";
import CoursesPage from "@/views/Courses";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

export default async function CoursesRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  return <CoursesPage />;
}


