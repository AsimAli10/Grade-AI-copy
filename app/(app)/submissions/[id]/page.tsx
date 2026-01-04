import { redirect } from "next/navigation";
import SubmissionReviewPage from "@/views/SubmissionReview";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

type SubmissionReviewRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function SubmissionReviewRoute({ params }: SubmissionReviewRouteProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const { id } = await params;

  return <SubmissionReviewPage submissionId={id} />;
}


