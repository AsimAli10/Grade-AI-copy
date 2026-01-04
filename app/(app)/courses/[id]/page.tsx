import { redirect } from "next/navigation";
import CourseDetailPage from "@/views/CourseDetail";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

type CourseDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseDetailRoute({ params }: CourseDetailRouteProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const { id } = await params;

  return <CourseDetailPage courseId={id} />;
}


