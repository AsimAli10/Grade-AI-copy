"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, User, Settings, LayoutDashboard, LogOut, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavigationLinks } from "./NavigationLinks";
import { AppNavigationLinks } from "./AppNavigationLinks";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type HeaderClientProps = {
  initialUser?: SupabaseUser | null;
};

export function HeaderClient({ initialUser = null }: HeaderClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    let isMounted = true;

    if (!initialUser) {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (!isMounted) return;
          setUser(session?.user ?? null);
          setLoading(false);
        })
        .catch((error) => {
          console.error("HeaderClient: failed to load session", error);
          if (!isMounted) return;
          setUser(null);
          setLoading(false);
        });
    } else {
      setUser(initialUser);
      setLoading(false);
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [initialUser]);

  const handleLogout = async () => {
    try {
      // clear client session first
      const { error: clientError } = await supabase.auth.signOut({ scope: "local" });
      if (clientError && clientError.message !== "Auth session missing!") {
        throw clientError;
      }

      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok && response.status !== 401) {
        const data = await response.json().catch(() => null);
        const message = data?.error || "Failed to clear session.";
        throw new Error(message);
      }

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });

      setUser(null);

      router.push("/");
      router.refresh();
    } catch (error: any) {
      if (error?.message === "Auth session missing!") {
        setUser(null);
        router.push("/");
        router.refresh();

        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
        return;
      }

      toast({
        title: "Error",
        description: error.message || "Failed to log out.",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const email = user.email || "";
    return email.charAt(0).toUpperCase();
  };

  return (
    <>
      <div className="hidden md:flex items-center space-x-3">
        <ThemeToggle />
        {loading ? (
          <div className="w-20 h-9" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email ?? ""} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.user_metadata?.full_name || "User"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="bg-primary hover:bg-primary-hover">
              <Link href="/auth">Get Started</Link>
            </Button>
          </>
        )}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between mb-4">
              <DrawerTitle className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                Menu
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-4">
            {user ? <AppNavigationLinks /> : <NavigationLinks />}
            <div className="flex flex-col space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between px-4 py-3 mb-2 border-b">
                <span className="text-base font-medium">Theme</span>
                <ThemeToggle />
              </div>

              {loading ? (
                <div className="h-10" />
              ) : user ? (
                <>
                  <DrawerClose asChild>
                    <Link href="/dashboard" className="text-base font-medium py-3 px-4 rounded-lg hover:bg-muted transition-colors">
                      Dashboard
                    </Link>
                  </DrawerClose>
                  <DrawerClose asChild>
                    <Link href="/profile" className="text-base font-medium py-3 px-4 rounded-lg hover:bg-muted transition-colors">
                      Profile
                    </Link>
                  </DrawerClose>
                  <DrawerClose asChild>
                    <Link href="/settings" className="text-base font-medium py-3 px-4 rounded-lg hover:bg-muted transition-colors">
                      Settings
                    </Link>
                  </DrawerClose>
                  <div className="my-2 border-t" />
                  <DrawerClose asChild>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-600 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      Log out
                    </Button>
                  </DrawerClose>
                </>
              ) : (
                <>
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/auth">Sign In</Link>
                    </Button>
                  </DrawerClose>
                  <DrawerClose asChild>
                    <Button className="w-full bg-primary hover:bg-primary-hover" asChild>
                      <Link href="/auth">Get Started</Link>
                    </Button>
                  </DrawerClose>
                </>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

