"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Save, Upload, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type QuizSubmissionReviewProps = {
  attemptId: string;
};

export default function QuizSubmissionReview({ attemptId }: QuizSubmissionReviewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [gradedAnswers, setGradedAnswers] = useState<Record<string, any>>({});
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [syncingToGCR, setSyncingToGCR] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchAttemptData();
  }, [attemptId]);

  const fetchAttemptData = async () => {
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

      const response = await fetch(`/api/quiz-attempts/${attemptId}/grade`);
      const data = await response.json();

      if (response.ok && data.attempt) {
        setAttempt(data.attempt);
        setQuiz((data.attempt.quizzes as any));
        setStudent((data.attempt.students as any));
        
        // Initialize graded answers if already graded
        if (data.attempt.score !== null) {
          // Re-grade to get graded answers
          await gradeQuiz(data.attempt);
        } else {
          // Initialize with student answers
          const answers = data.attempt.answers || {};
          const questions = Array.isArray((data.attempt.quizzes as any)?.questions) 
            ? (data.attempt.quizzes as any).questions 
            : [];
          
          const initialGraded: Record<string, any> = {};
          questions.forEach((q: any) => {
            const qId = q.id || q.question;
            initialGraded[qId] = {
              answer: answers[qId],
              points: 0,
              max_points: parseInt(q.points) || 1,
            };
          });
          setGradedAnswers(initialGraded);
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load quiz attempt",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching quiz attempt:", error);
      toast({
        title: "Error",
        description: "Failed to load quiz attempt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const gradeQuiz = async (attemptData?: any) => {
    const attemptToGrade = attemptData || attempt;
    if (!attemptToGrade || !quiz) return;

    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const answers = attemptToGrade.answers || {};
    const graded: Record<string, any> = {};

    for (const question of questions) {
      const questionId = question.id || question.question;
      const studentAnswer = answers[questionId];

      if (question.type === "multiple_choice" || question.type === "true_false") {
        const isCorrect = studentAnswer === question.correct_answer;
        const points = isCorrect ? (parseInt(question.points) || 1) : 0;
        graded[questionId] = {
          answer: studentAnswer,
          correct: isCorrect,
          points: points,
          max_points: parseInt(question.points) || 1,
        };
      } else if (question.type === "short_answer") {
        const manualScore = manualScores[questionId] ?? 0;
        graded[questionId] = {
          answer: studentAnswer,
          points: manualScore,
          max_points: parseInt(question.points) || 1,
          manually_graded: true,
        };
      }
    }

    setGradedAnswers(graded);
    return graded;
  };

  const handleSaveGrade = async () => {
    try {
      setSaving(true);
      
      // Validate that we have answers
      if (!attempt?.answers && Object.keys(manualScores).length === 0) {
        toast({
          title: "Error",
          description: "No answers to grade",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/quiz-attempts/${attemptId}/grade`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: attempt?.answers || {},
          manual_scores: manualScores,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Quiz graded successfully. Score: ${data.score}/${data.max_score} (${data.max_score > 0 ? Math.round((data.score / data.max_score) * 100) : 0}%)`,
        });
        await fetchAttemptData();
      } else {
        console.error("Grading error:", data);
        toast({
          title: "Error",
          description: data.error || `Failed to grade quiz: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error grading quiz:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to grade quiz. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToGoogleClassroom = async () => {
    if (!attempt?.google_classroom_submission_id || !quiz?.google_classroom_quiz_id) {
      toast({
        title: "Error",
        description: "This quiz attempt is not linked to Google Classroom",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncingToGCR(true);

      const response = await fetch("/api/google-classroom/sync-quiz-grades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId: attemptId,
          quizId: quiz.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Quiz grade synced to Google Classroom",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to sync grade to Google Classroom",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error syncing to Google Classroom:", error);
      toast({
        title: "Error",
        description: "Failed to sync grade to Google Classroom",
        variant: "destructive",
      });
    } finally {
      setSyncingToGCR(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-6 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!attempt || !quiz) {
    return (
      <div className="w-full px-6 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-xl font-semibold mb-2">Quiz attempt not found</h3>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const answers = attempt.answers || {};
  const totalScore = attempt.score || 0;
  const maxScore = attempt.max_score || questions.reduce((sum: number, q: any) => sum + (parseInt(q.points) || 1), 0);
  const studentName = (student as any)?.full_name || (student as any)?.email || "Unknown Student";
  const hasGCR = !!attempt.google_classroom_submission_id && !!quiz.google_classroom_quiz_id;
  const isTeacher = userRole === "teacher" || userRole === "admin";

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{quiz.title}</h1>
            <p className="text-muted-foreground text-lg mb-2">
              Student: {studentName}
            </p>
            {attempt.submitted_at && (
              <p className="text-sm text-muted-foreground">
                Submitted: {new Date(attempt.submitted_at).toLocaleString()}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {totalScore.toFixed(1)} / {maxScore.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              {maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quiz Questions</CardTitle>
            {isTeacher && (
              <div className="flex gap-2">
                <Button onClick={handleSaveGrade} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Grade"}
                </Button>
                {hasGCR && (
                  <Button
                    variant="outline"
                    onClick={handleSyncToGoogleClassroom}
                    disabled={syncingToGCR}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {syncingToGCR ? "Syncing..." : "Sync to Google Classroom"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((question: any, index: number) => {
            const questionId = question.id || question.question;
            const studentAnswer = answers[questionId];
            const graded = gradedAnswers[questionId];
            const isCorrect = graded?.correct;
            const points = graded?.points || 0;
            const maxPoints = graded?.max_points || parseInt(question.points) || 1;

            return (
              <div key={questionId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">Question {index + 1}</span>
                      <Badge variant="outline">
                        {question.type === "multiple_choice"
                          ? "Multiple Choice"
                          : question.type === "true_false"
                          ? "True/False"
                          : "Short Answer"}
                      </Badge>
                      <Badge variant="secondary">
                        {maxPoints} point{maxPoints !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <p className="font-medium mb-3">{question.question}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {graded && (
                      <>
                        {isCorrect !== undefined && (
                          isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )
                        )}
                        <span className="font-semibold">
                          {points.toFixed(1)} / {maxPoints}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {question.type === "multiple_choice" && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option: string, optIndex: number) => {
                      const isSelected = studentAnswer === option;
                      const isCorrectOption = question.correct_answer === option;
                      
                      return (
                        <div
                          key={optIndex}
                          className={`p-3 rounded border ${
                            isSelected
                              ? isCorrectOption
                                ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                                : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                              : isCorrectOption
                              ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                              : "bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <Badge variant={isCorrectOption ? "default" : "destructive"}>
                                Student Answer
                              </Badge>
                            )}
                            {isCorrectOption && (
                              <Badge variant="outline">Correct Answer</Badge>
                            )}
                            <span>{option}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.type === "true_false" && (
                  <div className="space-y-2">
                    {["True", "False"].map((option) => {
                      const isSelected = studentAnswer === option;
                      const isCorrectOption = question.correct_answer === option;
                      
                      return (
                        <div
                          key={option}
                          className={`p-3 rounded border ${
                            isSelected
                              ? isCorrectOption
                                ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                                : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                              : isCorrectOption
                              ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                              : "bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <Badge variant={isCorrectOption ? "default" : "destructive"}>
                                Student Answer
                              </Badge>
                            )}
                            {isCorrectOption && (
                              <Badge variant="outline">Correct Answer</Badge>
                            )}
                            <span>{option}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.type === "short_answer" && (
                  <div className="space-y-2">
                    <div className="p-3 bg-muted rounded">
                      <Label className="text-sm font-medium">Student Answer:</Label>
                      <p className="mt-1">{studentAnswer || "No answer provided"}</p>
                    </div>
                    {isTeacher && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`score-${questionId}`}>Score:</Label>
                        <Input
                          id={`score-${questionId}`}
                          type="number"
                          min="0"
                          max={maxPoints}
                          step="0.1"
                          value={manualScores[questionId] ?? points}
                          onChange={(e) =>
                            setManualScores((prev) => ({
                              ...prev,
                              [questionId]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          / {maxPoints}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

