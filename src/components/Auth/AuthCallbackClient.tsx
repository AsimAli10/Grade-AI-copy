'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPostAuthNavigationPath } from "@/utils/auth-navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { GraduationCap, Users, Shield } from "lucide-react";

export function AuthCallbackClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"admin" | "teacher" | "student">("teacher");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle OAuth callback - exchange code for session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // If no session, try to get it from the URL hash (OAuth redirect)
        if (!session) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            // Set the session from URL hash
            const { data: { session: newSession }, error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (setError) throw setError;
            if (!newSession) {
              throw new Error("Failed to create session");
            }
            
            // Update state with new session
            const sessionToUse = newSession;
            setUserId(sessionToUse.user.id);
            setUserEmail(sessionToUse.user.email || null);
            
            // Check profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, role, full_name')
              .eq('id', sessionToUse.user.id)
              .maybeSingle();

            if (profileError && profileError.code !== 'PGRST116') {
              console.error("Profile check error:", profileError);
            }

            if (!profile || !(profile as any).role) {
              setNeedsRoleSelection(true);
              setLoading(false);
              return;
            }

            toast({ title: "Success!", description: "You've been signed in successfully." });
            const redirectPath = await getPostAuthNavigationPath();
            router.push(redirectPath);
            window.location.reload();
            return;
          }
        }

        if (sessionError) throw sessionError;

        if (!session?.user) {
          toast({
            title: "Authentication failed",
            description: "Unable to authenticate. Please try again.",
            variant: "destructive",
          });
          router.push("/auth");
          return;
        }

        setUserId(session.user.id);
        setUserEmail(session.user.email || null);

        // Check if profile exists and has a role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, full_name')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is okay for new users
          console.error("Profile check error:", profileError);
        }

        // If profile doesn't exist or doesn't have a role, show role selection
        if (!profile || !(profile as any).role) {
          setNeedsRoleSelection(true);
          setLoading(false);
          return;
        }

        // Profile exists with role, proceed normally
        toast({ title: "Success!", description: "You've been signed in successfully." });
        const redirectPath = await getPostAuthNavigationPath();
        router.push(redirectPath);
        window.location.reload();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "An error occurred during authentication.",
          variant: "destructive",
        });
        router.push("/auth");
      }
    };

    void handleAuthCallback();
  }, [router, toast]);

  const handleRoleSelection = async () => {
    if (!userId || !userEmail) {
      toast({
        title: "Error",
        description: "User information not found. Please try signing in again.",
        variant: "destructive",
      });
      router.push("/auth");
      return;
    }

    setLoading(true);

    try {
      // Create/update profile with selected role
      const { error } = await supabase.functions.invoke("complete-profile", {
        body: {
          userId: userId,
          email: userEmail,
          full_name: null, // Can be updated later in profile settings
          role: selectedRole,
        },
      });

      if (error) {
        throw new Error("Unable to save profile: " + (error.message || "Unknown error"));
      }

      toast({
        title: "Profile created",
        description: "Your account has been set up successfully.",
      });

      const redirectPath = await getPostAuthNavigationPath();
      router.push(redirectPath);
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (needsRoleSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Complete Your Setup</h1>
            <p className="text-muted-foreground">
              Please select your role to continue
            </p>
          </div>

          <div className="space-y-4 bg-card p-6 rounded-lg border shadow-lg">
            <div className="space-y-2">
              <Label htmlFor="role-select" className="text-sm font-medium">
                I am a
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(value: "admin" | "teacher" | "student") =>
                  setSelectedRole(value)
                }
              >
                <SelectTrigger id="role-select" className="h-11">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>Teacher</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="student">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Student</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Administrator</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRole === "teacher" && "Grade assignments and manage courses"}
                {selectedRole === "student" && "Submit assignments and view grades"}
                {selectedRole === "admin" && "Manage organization settings and users"}
              </p>
            </div>

            <Button
              onClick={handleRoleSelection}
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary-hover"
            >
              {loading ? "Setting up..." : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
