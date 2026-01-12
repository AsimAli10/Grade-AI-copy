import { redirect } from "next/navigation";
import QuizDetailPage from "@/views/QuizDetail";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

type QuizDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function QuizDetailRoute({ params }: QuizDetailRouteProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const { id } = await params;

  return <QuizDetailPage quizId={id} />;
}

