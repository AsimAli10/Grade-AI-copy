import { redirect } from "next/navigation";
import ForumDetailClient from "@/components/Forums/ForumDetailClient";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

type ForumDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function ForumDetailPage({ params }: ForumDetailPageProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  return <ForumDetailClient forumId={params.id} />;
}
