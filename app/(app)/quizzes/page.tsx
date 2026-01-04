import { redirect } from "next/navigation";
import QuizzesPage from "@/views/Quizzes";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

export default async function QuizzesRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  return <QuizzesPage />;
}


