"use client";

import { BookOpen, Brain, Code, FileText, BarChart3, MessageSquare, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FeaturesHero } from "@/components/Features/FeaturesHero";

export default function FeaturesPage() {
  const features = [
    {
      icon: BookOpen,
      title: "Google Classroom Integration",
      description: "Seamlessly connect your Google Classroom account and automatically sync assignments, submissions, and student data.",
      details: [
        "Automatic course and assignment synchronization",
        "Real-time submission updates",
        "Student roster management",
        "OAuth-based secure connection"
      ],
    },
    {
      icon: Brain,
      title: "AI-Powered Grading",
      description: "Grade assignments instantly using configurable rubrics and advanced LLMs with detailed feedback and evidence highlights.",
      details: [
        "Multiple LLM model support (OpenAI, Gemini)",
        "Per-criterion scoring with explanations",
        "Evidence highlighting in submissions",
        "Confidence scores for each grade"
      ],
    },
    {
      icon: Code,
      title: "Code Execution Sandbox",
      description: "Secure sandboxed environment for programming assignments supporting Python, JavaScript, Java, and more.",
      details: [
        "Isolated container execution",
        "Automated test case evaluation",
        "Resource and time limits",
        "Support for multiple programming languages"
      ],
    },
    {
      icon: FileText,
      title: "Flexible Rubrics",
      description: "Create rubrics via form, JSON, or upload PDF/DOCX with version control and editing capabilities.",
      details: [
        "Multiple rubric input methods",
        "Version history tracking",
        "Weighted criteria scoring",
        "Example-based rubric templates"
      ],
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Track student performance, identify weaknesses, and get AI-generated improvement tips for each student.",
      details: [
        "Class-wide performance metrics",
        "Individual student analytics",
        "Trend analysis over time",
        "Personalized improvement recommendations"
      ],
    },
    {
      icon: MessageSquare,
      title: "Teacher Forums",
      description: "Collaborate with other teachers, share rubrics, and discuss best practices in dedicated forums.",
      details: [
        "Channel-based discussions",
        "Rubric sharing and pinning",
        "Thread-based conversations",
        "Role-based access control"
      ],
    },
  ];
  
  return (
    <div className="bg-background">
      <FeaturesHero />

      <section className="bg-background transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card
                  key={index}
                  className="hover:shadow-strong transition-all duration-300 border border-slate-200/60 dark:border-white/10 hover:border-primary/30 dark:hover:border-primary/30 backdrop-blur-sm bg-white/90 dark:bg-white/5 h-full flex flex-col"
                >
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center mb-4">
                      <IconComponent className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3">
                      {feature.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted/30">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-5">
              <h2 className="text-3xl sm:text-4xl font-bold">Ready to Transform Your Grading Workflow?</h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands of teachers who are saving hours every week with AI-powered grading
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                  <Link href="/auth">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/how-it-works">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
