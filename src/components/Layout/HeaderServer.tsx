import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { NavigationLinks } from "./NavigationLinks";
import { AppNavigationLinks } from "./AppNavigationLinks";
import { HeaderClient } from "./HeaderClient";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

export async function HeaderServer() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  const isSignedIn = !!user;

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container mx-auto px-6 py-5 flex items-center gap-8">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent tracking-tight">
            GradeAI
          </span>
        </Link>
        <div className="hidden md:flex flex-1">
          {isSignedIn ? (
            <AppNavigationLinks className="ml-8 flex items-center space-x-2" />
          ) : (
            <NavigationLinks className="ml-8 flex items-center space-x-8" />
          )}
        </div>
        <div className="flex-1 md:flex-none flex justify-end">
          <HeaderClient initialUser={user} />
        </div>
      </div>
    </header>
  );
}

