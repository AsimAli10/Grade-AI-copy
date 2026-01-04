import { redirect } from "next/navigation";
import AssignmentDetailPage from "@/views/AssignmentDetail";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

type AssignmentDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function AssignmentDetailRoute({ params }: AssignmentDetailRouteProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const { id } = await params;

  return <AssignmentDetailPage assignmentId={id} />;
}


