import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import TopBar from "@/components/Layout/TopBar";
import { HeaderServer } from "@/components/Layout/HeaderServer";
import Footer from "@/components/Layout/Footer";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* <TopBar /> */}
      <HeaderServer />
      <main className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

