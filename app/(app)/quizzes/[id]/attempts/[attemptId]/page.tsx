import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import QuizSubmissionReview from "@/components/Quizzes/QuizSubmissionReview";

type QuizAttemptRouteProps = {
  params: Promise<{ id: string; attemptId: string }>;
};

export default async function QuizAttemptRoute({ params }: QuizAttemptRouteProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const { attemptId } = await params;

  return <QuizSubmissionReview attemptId={attemptId} />;
}

