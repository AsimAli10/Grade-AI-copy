"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileQuestion, ArrowLeft, Clock, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type QuizDetailClientProps = {
  quizId: string;
};

export default function QuizDetailClient({ quizId }: QuizDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Fetch quiz with course info and questions
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select(`
          id,
          title,
          description,
          questions,
          time_limit_minutes,
          max_attempts,
          is_published,
          created_at,
          course_id,
          courses:course_id (
            id,
            name
          )
        `)
        .eq("id", quizId)
        .single();

      if (quizError || !quizData) {
        console.error("Error fetching quiz:", quizError);
        toast({
          title: "Error",
          description: "Failed to load quiz",
          variant: "destructive",
        });
        return;
      }

      setQuiz(quizData);
    } catch (error) {
      console.error("Error fetching quiz data:", error);
      toast({
        title: "Error",
        description: "Failed to load quiz data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-xl font-semibold mb-2">Quiz not found</h3>
            <p className="text-muted-foreground">The quiz you&apos;re looking for doesn&apos;t exist.</p>
            <Button onClick={() => router.push("/quizzes")} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const courseName = (quiz.courses as any)?.name || "Unknown Course";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/quizzes")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{quiz.title}</h1>
            <p className="text-muted-foreground text-lg mb-4">
              {courseName}
            </p>
            {quiz.description && (
              <p className="text-muted-foreground mb-4">{quiz.description}</p>
            )}
          </div>
          <Badge variant={quiz.is_published ? "default" : "secondary"}>
            {quiz.is_published ? "Published" : "Draft"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                Questions ({questions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No questions in this quiz yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {questions.map((question: any, index: number) => (
                    <div key={question.id || index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <span className="font-semibold text-lg text-muted-foreground">
                            {index + 1}.
                          </span>
                          <div className="flex-1">
                            <p className="font-medium mb-2">{question.question || "Question"}</p>
                            <Badge variant="outline" className="mb-2">
                              {question.type === "multiple_choice" ? "Multiple Choice" : 
                               question.type === "short_answer" ? "Short Answer" : 
                               question.type}
                            </Badge>
                            {question.points && (
                              <span className="text-sm text-muted-foreground ml-2">
                                {question.points} point{question.points !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {question.type === "multiple_choice" && question.options && question.options.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {question.options.map((option: string, optIndex: number) => {
                            const isCorrect = question.correct_answer === option;
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-2 p-2 rounded ${
                                  isCorrect ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" : "bg-muted"
                                }`}
                              >
                                {isCorrect ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className={isCorrect ? "font-medium text-green-700 dark:text-green-300" : ""}>
                                  {option}
                                </span>
                                {isCorrect && (
                                  <Badge variant="outline" className="ml-auto text-xs">
                                    Correct
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {question.type === "short_answer" && (
                        <div className="mt-4 p-3 bg-muted rounded">
                          <p className="text-sm text-muted-foreground">
                            Short answer question - students will provide a text response
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <FileQuestion className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Questions</p>
                  <p className="text-2xl font-bold">{questions.length}</p>
                </div>
              </div>

              {quiz.time_limit_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Time Limit</p>
                    <p className="text-lg font-semibold">{quiz.time_limit_minutes} minutes</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Max Attempts</p>
                  <p className="text-lg font-semibold">{quiz.max_attempts || 1}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Created</p>
                <p className="text-sm">
                  {new Date(quiz.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" disabled>
                Edit Quiz
              </Button>
              <Button variant="outline" className="w-full" disabled>
                View Attempts
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Publish Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

