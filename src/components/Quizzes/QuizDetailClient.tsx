"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileQuestion, ArrowLeft, Clock, CheckCircle2, Circle, Users, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type QuizDetailClientProps = {
  quizId: string;
};

export default function QuizDetailClient({ quizId }: QuizDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

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

      // Get user role
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setUserRole((profileData as any).role);
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

      // Fetch quiz attempts with student info
      const { data: attemptsData, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          student_id,
          answers,
          score,
          max_score,
          submitted_at,
          started_at,
          google_classroom_submission_id,
          students:student_id (
            id,
            full_name,
            email
          )
        `)
        .eq("quiz_id", quizId)
        .order("submitted_at", { ascending: false });

      if (attemptsError) {
        console.error("Error fetching quiz attempts:", attemptsError);
      } else if (attemptsData) {
        const processedAttempts = attemptsData.map((attempt: any) => {
          const student = (attempt.students as any) || {};
          return {
            id: attempt.id,
            studentId: attempt.student_id,
            studentName: student.full_name || student.email || "Unknown Student",
            score: attempt.score,
            maxScore: attempt.max_score,
            gradeDisplay: attempt.score !== null && attempt.max_score !== null
              ? `${attempt.score}/${attempt.max_score}`
              : "—",
            percentage: attempt.score !== null && attempt.max_score !== null && attempt.max_score > 0
              ? Math.round((attempt.score / attempt.max_score) * 100)
              : null,
            submittedAt: attempt.submitted_at,
            startedAt: attempt.started_at,
            hasGCR: !!attempt.google_classroom_submission_id,
            isGraded: attempt.score !== null,
          };
        });
        setAttempts(processedAttempts);
      }
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
  const quizDescription = (quiz as any)?.description;

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
        <div>
          <h1 className="text-4xl font-bold mb-6">Quiz</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              {questions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No questions in this quiz yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {questions.map((question: any, index: number) => (
                    <div key={question.id || index} className="border-t pt-4 first:border-t-0 first:pt-0">
                      <h3 className="text-lg font-semibold mb-2">{question.question || "Question"}</h3>
                      {question.description && (
                        <p className="text-muted-foreground mb-2">{question.description}</p>
                      )}
                      {quizDescription && quizDescription.trim() && index === 0 && (
                        <p className="text-muted-foreground mb-2">{quizDescription}</p>
                      )}
                      {question.type === "multiple_choice" && question.options && question.options.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {question.options.map((option: string, optIndex: number) => {
                            // Compare correct_answer with option, handling potential type mismatches
                            const correctAnswer = question.correct_answer?.toString().trim();
                            const optionText = option?.toString().trim();
                            const isCorrect = correctAnswer && optionText && correctAnswer === optionText;
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-2 p-2 rounded ${
                                  isCorrect ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" : "bg-muted"
                                }`}
                              >
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {(userRole === "teacher" || userRole === "admin") && (
            <Card data-quiz-attempts>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Quiz Attempts ({attempts.length})
                </CardTitle>
                <CardDescription>Student submissions and grades for this quiz</CardDescription>
              </CardHeader>
              <CardContent>
                {attempts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">No attempts yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Students&apos; quiz attempts will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attempts.map((attempt) => (
                        <TableRow key={attempt.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{attempt.studentName}</TableCell>
                          <TableCell>
                            {attempt.isGraded ? (
                              <div className="flex flex-col">
                                <span className="font-semibold">{attempt.gradeDisplay}</span>
                                {attempt.percentage !== null && (
                                  <span className="text-xs text-muted-foreground">
                                    {attempt.percentage}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not graded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={attempt.isGraded ? "default" : "secondary"}>
                              {attempt.isGraded ? "Graded" : "Needs Grading"}
                            </Badge>
                            {attempt.hasGCR && (
                              <Badge variant="outline" className="ml-2">Google Classroom</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {attempt.submittedAt
                              ? new Date(attempt.submittedAt).toLocaleDateString()
                              : attempt.startedAt
                              ? `Started: ${new Date(attempt.startedAt).toLocaleDateString()}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/quizzes/${quizId}/attempts/${attempt.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
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
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Submissions</p>
                  <p className="text-lg font-semibold">{attempts.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {attempts.filter((a: any) => a.isGraded).length} graded, {attempts.filter((a: any) => !a.isGraded).length} pending
                  </p>
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
              {attempts.length > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    const attemptsSection = document.querySelector('[data-quiz-attempts]');
                    attemptsSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Attempts ({attempts.length})
                </Button>
              )}
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

