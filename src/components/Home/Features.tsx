"use client";

import { BookOpen, FileText, Brain, Code, BarChart3, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      icon: BookOpen,
      title: "Google Classroom Integration",
      description: "Seamlessly connect your Google Classroom account. Automatically sync assignments, submissions, and student data.",
    },
    {
      icon: Brain,
      title: "AI-Powered Grading",
      description: "Grade assignments instantly using configurable rubrics and advanced LLMs. Get detailed feedback and evidence highlights.",
    },
    {
      icon: Code,
      title: "Code Execution Sandbox",
      description: "Secure sandboxed environment for programming assignments. Supports Python, JavaScript, Java, and more.",
    },
    {
      icon: FileText,
      title: "Flexible Rubrics",
      description: "Create rubrics via form, JSON, or upload PDF/DOCX. Version control and edit before grading.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Track student performance, identify weaknesses, and get AI-generated improvement tips for each student.",
    },
    {
      icon: MessageSquare,
      title: "Teacher Forums",
      description: "Collaborate with other teachers, share rubrics, and discuss best practices in dedicated forums.",
    },
  ];
  
  return (
    <section
      id="features"
      className="relative w-full bg-[#F9FCFB] dark:bg-[#0A0A0A] transition-colors duration-300 py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 pb-2">Powerful Features for Modern Teachers</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Everything you need to streamline grading and provide better feedback to your students
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="h-full">
                <CardHeader className="p-4 sm:p-6">
                  <IconComponent className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-2" />
                  <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
