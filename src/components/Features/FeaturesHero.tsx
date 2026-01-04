"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles, Timer, ShieldCheck, GraduationCap, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function FeaturesHero() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/auth");
    }
  };

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-white dark:bg-[#000000] transition-colors duration-300 min-h-screen"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="absolute inset-0 bg-gradient-hero opacity-5 dark:opacity-10" />

      <div className="container mx-auto px-4 relative w-full z-10 py-[19px] sm:py-[35px] md:py-[43px] lg:py-[51px] lg:pt-[63px] xl:pt-[75px]">
        <div className="hidden lg:flex items-center w-full">
          <div className="w-full flex flex-row items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16">
            {/* Left Section - Value Proposition */}
            <div className="w-full text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[36rem] lg:pr-8 xl:pr-12 self-start">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold mb-4 sm:mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight pb-2">
                Powerful Features for Modern Teachers
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-7 leading-relaxed">
                Everything you need to streamline grading, provide better feedback, and save hours every week
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-start">
                <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" onClick={handleGetStarted}>
                  Get Started Free
                </Button>
                <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                  <Link href="/how-it-works">Learn How It Works</Link>
                </Button>
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

            {/* Right Section - Card */}
            <div className="w-full max-w-lg lg:max-w-[32rem] xl:max-w-[36rem] self-start lg:ml-auto lg:mt-1.5 xl:mt-2">
              <Card className="relative overflow-hidden border border-primary/20 bg-white/80 dark:bg-white/5 shadow-strong backdrop-blur">
                <CardHeader className="pb-2">
                  <span className="text-xs uppercase tracking-widest text-primary font-semibold">Live Snapshot</span>
                  <CardTitle className="text-2xl">GradeAI Dashboard</CardTitle>
                  <CardDescription>
                    Real-time grading insights and course management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-primary/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-primary font-semibold">Avg Grading Time</p>
                      <p className="text-3xl font-bold text-primary mt-2">30s</p>
                      <p className="text-xs text-primary/80 mt-1">Per submission</p>
                    </div>
                    <div className="rounded-xl bg-slate-900 text-white dark:bg-white/10 dark:text-white p-4">
                      <p className="text-xs uppercase tracking-wide text-white/70 font-semibold">Grading Accuracy</p>
                      <p className="text-3xl font-bold mt-2">95%</p>
                      <p className="text-xs text-white/70 mt-1">Teacher approved</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-black/40 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Sarah M.</p>
                        <p className="text-xs text-muted-foreground">High School Teacher</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      &quot;GradeAI has saved me 10+ hours per week. The AI grading is incredibly accurate and the feedback helps my students improve faster.&quot;
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex flex-col lg:hidden w-full gap-6">
          <div className="w-full text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight pb-1">
              Powerful Features for Modern Teachers
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 leading-relaxed">
              Everything you need to streamline grading and provide better feedback
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full">
            <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base w-full sm:w-auto" onClick={handleGetStarted}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" className="text-sm sm:text-base w-full sm:w-auto" asChild>
              <Link href="/how-it-works">Learn More</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 mt-6 w-full">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">AI-Powered Grading</p>
                <p className="text-xs text-muted-foreground">Instant feedback with detailed analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <Timer className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Save Hours Weekly</p>
                <p className="text-xs text-muted-foreground">Grade assignments in seconds</p>
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
      </div>
    </section>
  );
}
