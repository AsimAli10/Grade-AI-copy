"use client";

import { Button } from "@/components/ui/button";
import { GraduationCap, Sparkles, ShieldCheck, Timer, BookOpen, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Hero() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleConnectGoogleClassroom = () => {
    if (user) {
      // Redirect to Google OAuth authorization endpoint
      window.location.href = "/api/google-classroom/authorize";
    } else {
      router.push("/auth");
    }
  };

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <section
      id="hero"
      className="relative flex items-center justify-center overflow-hidden bg-white dark:bg-[#000000] transition-colors duration-300 min-h-screen"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="absolute inset-0 bg-gradient-hero opacity-5 dark:opacity-10" />

      <div className="container mx-auto px-4 relative w-full z-10 py-[19px] sm:py-[35px] md:py-[43px] lg:py-[51px]">
        {/* Mobile Layout - Vertical Stack */}
        <div className="flex flex-col lg:hidden w-full gap-6">
          {/* H1 and Description */}
          <div className="w-full text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight">
              AI-Powered Grading for Google Classroom
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 leading-relaxed">
              Automate grading with AI, provide detailed feedback, and save hours every week. Connect your Google Classroom and start grading in minutes.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary-hover text-sm sm:text-base w-full sm:w-auto"
              onClick={handleConnectGoogleClassroom}
            >
              <BookOpen className="h-5 w-5 mr-2" />
              {user ? "Connect Google Classroom" : "Get Started Free"}
            </Button>
            <Button size="lg" variant="outline" className="text-sm sm:text-base w-full sm:w-auto" asChild>
              <Link href="/how-it-works">Take a Tour</Link>
            </Button>
          </div>

          {/* Feature boxes */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 mt-6 w-full">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">AI-Powered Grading</p>
                <p className="text-xs text-muted-foreground">Instant feedback with detailed rubric analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <Timer className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Save Hours Weekly</p>
                <p className="text-xs text-muted-foreground">Grade assignments in seconds, not hours</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Consistent & Fair</p>
                <p className="text-xs text-muted-foreground">Objective grading with confidence scores</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Two Column */}
        <div className="hidden lg:flex items-center w-full">
          <div className="w-full flex flex-row items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16">
            {/* Left Section - Value Proposition */}
            <div className="w-full text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[36rem] lg:pr-8 xl:pr-12 self-start">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold mb-4 sm:mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight">
                AI-Powered Grading for Google Classroom
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-7 leading-relaxed">
                Automate grading with AI, provide detailed feedback, and save hours every week. Connect your Google Classroom and start grading in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-start mb-6">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary-hover text-sm sm:text-base"
                  onClick={handleConnectGoogleClassroom}
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  {user ? "Connect Google Classroom" : "Get Started Free"}
                </Button>
                <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                  <Link href="/how-it-works">Take a Tour</Link>
                </Button>
              </div>

              {/* Quick benefits list */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Automatic sync with Google Classroom</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Configurable rubrics (form, JSON, or document upload)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Code execution sandbox for programming assignments</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Analytics & personalized improvement tips</span>
                </div>
              </div>

              {/* Feature boxes for desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-7 lg:mt-8">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">AI-Powered</p>
                    <p className="text-xs text-muted-foreground">Smart grading</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                  <Timer className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Save Time</p>
                    <p className="text-xs text-muted-foreground">Hours weekly</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Consistent</p>
                    <p className="text-xs text-muted-foreground">Fair grading</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Product Preview Card */}
            <div className="w-full max-w-lg lg:max-w-[32rem] xl:max-w-[36rem] self-start lg:ml-auto lg:mt-1.5 xl:mt-2">
              <Card className="shadow-strong">
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 sm:p-10 md:p-12 bg-gradient-card">
                    <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2 text-center">Get Started in Minutes</p>
                    <p className="text-sm text-muted-foreground mb-6 text-center">
                      Connect your Google Classroom account and start grading with AI
                    </p>
                    <div className="flex flex-col gap-3">
                      <Button size="lg" className="bg-primary hover:bg-primary-hover w-full" onClick={handleConnectGoogleClassroom}>
                        <BookOpen className="h-5 w-5 mr-2" />
                        {user ? "Connect Google Classroom" : "Get Started Free"}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        No credit card required • Free trial available
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
