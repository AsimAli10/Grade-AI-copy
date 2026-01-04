'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen,
  BarChart3,
  Brain,
  User,
  FileText,
  GraduationCap,
  Shield,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPostAuthNavigationPath } from "@/utils/auth-navigation";
import { getUrl } from "@/utils/url";

export function AuthClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [tabValue, setTabValue] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [signupEmail, setSignupEmail] = useState("\u200b");
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const [signupSession, setSignupSession] = useState<any>(null);
  const [profileData, setProfileData] = useState({ fullName: "", role: "teacher" as "admin" | "teacher" | "student" });

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toast({ title: "Success", description: "Signed in successfully" });
      const redirectPath = await getPostAuthNavigationPath();
      router.push(redirectPath);
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message || "Failed to sign in. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("signup-email") as string;
    const password = formData.get("signup-password") as string;

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        setSignupEmail(email);
        setSignupUserId(data.user.id);
        setSignupSession(data.session);

        // Create/update profile with selected role
        // The trigger creates a profile with default 'teacher' role
        // We update it here with the user's selected role
        try {
          const { error: profileError } = await supabase.functions.invoke("complete-profile", {
            body: {
              userId: data.user.id,
              email: email,
              full_name: null, // Will be set in step 2
              role: profileData.role,
            },
          });

          if (profileError) {
            console.error("Profile creation error:", profileError);
            // Continue anyway - profile exists from trigger, will be updated in step 2
          }
        } catch (profileErr) {
          console.error("Failed to create profile:", profileErr);
          // Continue anyway - profile exists from trigger
        }

        // If email is confirmed, go to step 2, otherwise show verification message
        if (data.session?.user?.email_confirmed_at) {
          setSignupStep(2);
        } else {
          toast({
            title: "Account created",
            description: "Please check your email to verify your account, then complete your profile.",
          });
          setSignupStep(2);
        }
      } else {
        toast({
          title: "Error creating account",
          description: "User data was not returned. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error creating account",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBioSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (!signupUserId) {
        throw new Error("User ID not found");
      }

      let session = signupSession;
      if (!session) {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        session = currentSession;
      }

      // Update profile with full name and role (profile may already exist from trigger)
      const { error } = await supabase.functions.invoke("complete-profile", {
        body: {
          userId: signupUserId,
          email: signupEmail,
          full_name: profileData.fullName || null,
          role: profileData.role,
        },
      });

      if (error) {
        throw new Error("Unable to save profile: " + (error.message || "Unknown error"));
      }

      const { data } = await supabase.auth.getSession();
      const isEmailConfirmed = data.session?.user?.email_confirmed_at;

      toast({
        title: "Profile completed",
        description: isEmailConfirmed
          ? "Your profile has been created successfully."
          : "Your profile has been created. Please verify your email to continue.",
      });

      if (isEmailConfirmed) {
        const redirectPath = await getPostAuthNavigationPath();
        router.push(redirectPath);
        window.location.reload();
      } else {
        setSignupStep(1);
        setTabValue("signin");
      }
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getUrl("/auth/callback") },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to authenticate with Google. Please try again.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-secondary/5 dark:from-[#000000] dark:via-[#0A0A0A] dark:to-[#1A1A1A] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-6xl mx-auto relative z-10 flex-1 px-4 sm:px-6 lg:px-8 py-10 lg:py-16 flex flex-col lg:flex-row items-stretch gap-10 lg:gap-16">
        <div className="hidden lg:flex flex-1 flex-col justify-center space-y-6 pl-1">
          <div className="space-y-5 max-w-lg">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold leading-snug text-foreground">
                Welcome to GradeAI
              </h1>
            </div>
            <p className="text-lg text-muted-foreground dark:text-slate-300">
              AI-powered grading for Google Classroom. Automate grading, provide detailed feedback, and save hours every week.
            </p>

            <div className="grid gap-4">
              {[
                {
                  icon: BookOpen,
                  title: "Google Classroom Integration",
                  description: "Seamlessly connect your Google Classroom account and automatically sync assignments and submissions.",
                },
                {
                  icon: Brain,
                  title: "AI-Powered Grading",
                  description: "Grade assignments instantly using configurable rubrics and advanced LLM models with detailed feedback.",
                },
                {
                  icon: BarChart3,
                  title: "Analytics & Insights",
                  description: "Track student performance, identify weaknesses, and get AI-generated improvement tips for each student.",
                },
              ].map(({ icon: Icon, title, description }) => (
                <div className="flex items-start gap-3" key={title}>
                  <div className="p-2 bg-primary/20 rounded-lg mt-1">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground dark:text-slate-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full flex-1 max-w-xl mx-auto lg:mx-0 flex flex-col justify-center lg:pl-10">
          <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">
                {tabValue === "signin" ? "Welcome Back" : "Create Your Account"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tabValue === "signin"
                  ? "Sign in to access your GradeAI dashboard"
                  : "Get started with AI-powered grading for your classroom"}
              </p>
            </div>

            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 dark:bg-black/10 backdrop-blur-sm border-2 border-white/20 dark:border-white/10">
              <TabsTrigger value="signin" className="text-sm font-medium">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-sm font-medium">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        className="pl-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="pl-10 pr-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-white/20 dark:border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white/10 dark:bg-black/20 backdrop-blur-sm px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-11 border-2 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-white/30 dark:border-white/20 hover:bg-white/20 dark:hover:bg-black/20 hover:border-white/40 dark:hover:border-white/30 transition-all"
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isGoogleLoading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    {isGoogleLoading ? "Loading..." : "Continue with Google"}
                  </Button>

                  <Button className="w-full h-11 bg-primary hover:bg-primary-hover mt-4" type="submit" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              {signupStep === 1 ? (
                <form onSubmit={handleSignUp}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4 backdrop-blur-sm">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Start grading with AI-powered automation. Connect your Google Classroom after signup to get started.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                        <Input
                          id="signup-email"
                          name="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          required
                          className="pl-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                        <Input
                          id="signup-password"
                          name="signup-password"
                          type={showSignupPassword ? "text" : "password"}
                          required
                          minLength={6}
                          className="pl-10 pr-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-role" className="text-sm font-medium">
                        I am a
                      </Label>
                      <Select
                        value={profileData.role}
                        onValueChange={(value: "admin" | "teacher" | "student") =>
                          setProfileData({ ...profileData, role: value })
                        }
                      >
                        <SelectTrigger className="h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50">
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
                        {profileData.role === "teacher" && "Grade assignments and manage courses"}
                        {profileData.role === "student" && "Submit assignments and view grades"}
                        {profileData.role === "admin" && "Manage organization settings and users"}
                      </p>
                    </div>

                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t-2 border-white/20 dark:border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white/10 dark:bg-black/20 backdrop-blur-sm px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full h-11 border-2 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-white/30 dark:border-white/20 hover:bg-white/20 dark:hover:bg-black/20 hover:border-white/40 dark:hover:border-white/30 transition-all"
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={isGoogleLoading}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      {isGoogleLoading ? "Loading..." : "Sign up with Google"}
                    </Button>

                    <Button className="w-full h-11 bg-primary hover:bg-primary-hover mt-4" type="submit" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleBioSubmit}>
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold mb-2">Complete Your Profile</h3>
                      <p className="text-sm text-muted-foreground">
                        Add your name to complete your account setup.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full-name" className="text-sm font-medium">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                        <Input
                          id="full-name"
                          name="full-name"
                          type="text"
                          placeholder="Enter your full name"
                          required
                          value={profileData.fullName}
                          onChange={(event) => setProfileData({ ...profileData, fullName: event.target.value })}
                          className="pl-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role-display" className="text-sm font-medium">
                        Role
                      </Label>
                      <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                          {profileData.role === "teacher" && <GraduationCap className="h-4 w-4 text-primary" />}
                          {profileData.role === "student" && <Users className="h-4 w-4 text-primary" />}
                          {profileData.role === "admin" && <Shield className="h-4 w-4 text-primary" />}
                          <span className="font-medium capitalize">{profileData.role}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You selected this role during signup. Contact support to change it later.
                      </p>
                    </div>

                    <Button className="w-full h-11 bg-primary hover:bg-primary-hover mt-4" type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Complete Registration"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSignupStep(1);
                        setProfileData({ fullName: "", role: "teacher" });
                        setSignupUserId(null);
                        setSignupEmail("\u200b");
                        setSignupSession(null);
                      }}
                    >
                      Back
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm text-muted-foreground mt-6 px-4">
            By continuing, you agree to our {" "}
            <Link href="/terms" className="text-primary hover:underline font-medium">
              Terms of Service
            </Link>{" "}
            and {" "}
            <Link href="/privacy" className="text-primary hover:underline font-medium">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
