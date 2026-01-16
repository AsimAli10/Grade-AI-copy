"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileQuestion, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QuizCreator } from "./QuizCreator";

export default function QuizzesClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/quizzes");
      const data = await response.json();
      
      if (response.ok) {
        setQuizzes(data.quizzes || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load quizzes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast({
        title: "Error",
        description: "Failed to load quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Quizzes</h1>
          <p className="text-muted-foreground text-lg">AI-powered quiz creation and management</p>
        </div>
        <Button size="lg" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Quiz
        </Button>
      </div>

      <QuizCreator
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchQuizzes}
      />

      {loading ? (
        <div className="w-full px-6 py-8 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="shadow-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <FileQuestion className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground text-center mb-6 text-base">
              Create AI-powered quizzes from your course materials
            </p>
            <Button size="lg" onClick={() => setIsDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Quiz with AI
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz: any) => (
            <Card key={quiz.id} className="hover:shadow-md transition-all border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{quiz.title}</CardTitle>
                <CardDescription className="text-base">{quiz.courseName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base text-muted-foreground">{quiz.questionsCount} questions</span>
                  <Badge variant={quiz.published ? "default" : "secondary"}>
                    {quiz.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <Link href={`/quizzes/${quiz.id}`}>
                  <Button variant="outline" className="w-full">
                    View Quiz
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

