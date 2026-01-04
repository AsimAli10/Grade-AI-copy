"use client";

import { BookOpen, Upload, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HowItWorksHero } from "@/components/HowItWorks/HowItWorksHero";

function HowItWorksPage() {
  const steps = [
    {
      icon: BookOpen,
      title: "Connect Google Classroom",
      description: "Sign up and connect your Google Classroom account. We'll automatically sync your courses and assignments.",
      details: [
        "OAuth-based secure connection",
        "Automatic course synchronization",
        "Real-time assignment updates",
        "Student roster management"
      ],
      number: "01",
      colorClass: "bg-gradient-hero",
    },
    {
      icon: Upload,
      title: "Create Assignments & Rubrics",
      description: "Create assignments or map existing Classroom assignments. Upload rubrics via form, JSON, or document upload.",
      details: [
        "Map to existing Classroom assignments",
        "Create custom rubrics with weighted criteria",
        "Upload rubrics as PDF, DOCX, or JSON",
        "Preview rubric before saving"
      ],
      number: "02",
      colorClass: "bg-gradient-hero",
    },
    {
      icon: CheckCircle2,
      title: "AI Grades & You Review",
      description: "Submissions are automatically graded using AI. Review scores, edit if needed, and provide feedback to students.",
      details: [
        "Automatic AI grading on submission",
        "Per-criterion scores with explanations",
        "Evidence highlighting in student work",
        "Teacher override and feedback options"
      ],
      number: "03",
      colorClass: "bg-gradient-hero",
    },
  ];
  
  return (
    <div className="overflow-x-hidden bg-background">
      <HowItWorksHero />

      {/* Process */}
      <section className="bg-background">
        <div className="container mx-auto px-4 lg:px-12 py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">How GradeAI Works</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Get started in minutes and start saving hours every week on grading
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <Card
                  key={index}
                  className="relative flex flex-col border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-white/5 backdrop-blur-sm shadow-lg hover:shadow-strong transition-all duration-300 hover:border-primary/30 dark:hover:border-primary/30"
                >
                  <CardContent className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
                    <div className="flex items-center justify-between">
                      <div className={`rounded-xl ${step.colorClass} p-3 shadow-lg`}>
                        <IconComponent className="h-7 w-7 text-white" />
                      </div>
                      <span className="text-4xl font-black text-primary dark:text-primary">{step.number}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-foreground mb-2">{step.title}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                    <div className="space-y-2">
                      {step.details.map((detail, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 dark:bg-white/5 px-3 py-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1 block h-2 w-2 rounded-full bg-primary" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_70%)] pointer-events-none" />
        <div className="container relative z-10 mx-auto px-4 lg:px-16 py-16 sm:py-20 lg:py-24">
          <div className="max-w-5xl mx-auto text-center space-y-6 mb-10">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              Join Thousands of Teachers
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Start Grading Smarter Today</h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Connect your Google Classroom and experience the future of automated grading
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
              <Link href="/auth">Get Started Free</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              No credit card required • Free trial available
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HowItWorksPage;
