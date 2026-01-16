import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH /api/quiz-attempts/[id]/grade
 * Grade a quiz attempt (auto-grade MCQs, manual for others)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { answers, manual_scores } = body;

    // Get quiz attempt
    const { data: attempt, error: attemptError } = await (supabase
      .from("quiz_attempts") as any)
      .select(`
        *,
        quizzes:quiz_id (
          id,
          questions,
          google_classroom_quiz_id
        ),
        students:student_id (
          id,
          full_name,
          email
        )
      `)
      .eq("id", params.id)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Quiz attempt not found" },
        { status: 404 }
      );
    }

    const quiz = (attempt.quizzes as any);
    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Get user's role
    const { data: profile } = await (supabase
      .from("profiles") as any)
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if ((profile as any)?.role !== "teacher" && (profile as any)?.role !== "admin") {
      return NextResponse.json(
        { error: "Only teachers can grade quizzes" },
        { status: 403 }
      );
    }

    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    
    // Calculate score
    let totalScore = 0;
    let maxScore = 0;
    const gradedAnswers: Record<string, any> = {};

    // Merge answers from request with existing attempt answers
    const attemptAnswers = (attempt.answers || {}) as Record<string, any>;
    const mergedAnswers = { ...attemptAnswers, ...(answers || {}) };

    for (const question of questions) {
      const questionId = question.id || question.question;
      const questionPoints = parseInt(question.points) || 1;
      maxScore += questionPoints;

      // Get student's answer - check multiple possible keys
      let studentAnswer = mergedAnswers[questionId] || 
                         mergedAnswers[`q-${questionId}`] ||
                         attemptAnswers[questionId] ||
                         attemptAnswers[`q-${questionId}`] ||
                         null;
      
      // Handle case where answer might be nested (e.g., from Google Classroom)
      if (!studentAnswer && typeof mergedAnswers._content === 'string') {
        studentAnswer = mergedAnswers._content;
      }
      
      if (question.type === "multiple_choice" || question.type === "true_false") {
        // Auto-grade MCQs and True/False
        const isCorrect = studentAnswer === question.correct_answer;
        const points = isCorrect ? questionPoints : 0;
        totalScore += points;
        
        gradedAnswers[questionId] = {
          answer: studentAnswer || null,
          correct: isCorrect,
          points: points,
          max_points: questionPoints,
        };
      } else if (question.type === "short_answer") {
        // Manual grading for short answers
        const manualScore = manual_scores?.[questionId];
        if (manualScore !== undefined && manualScore !== null) {
          const points = Math.max(0, Math.min(questionPoints, parseFloat(String(manualScore)) || 0));
          totalScore += points;
          gradedAnswers[questionId] = {
            answer: studentAnswer || null,
            points: points,
            max_points: questionPoints,
            manually_graded: true,
          };
        } else {
          // Not graded yet - default to 0
          gradedAnswers[questionId] = {
            answer: studentAnswer || null,
            points: 0,
            max_points: questionPoints,
            manually_graded: false,
          };
        }
      }
    }

    // Update quiz attempt with score
    // Note: quiz_attempts table doesn't have updated_at column
    const updateData: any = {
      answers: mergedAnswers,
      score: totalScore,
      max_score: maxScore,
    };

    // Only update submitted_at if it's not already set
    if (!attempt.submitted_at) {
      updateData.submitted_at = new Date().toISOString();
    }

    const { data: updatedAttempt, error: updateError } = await (supabase
      .from("quiz_attempts") as any)
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating quiz attempt:", updateError);
      console.error("Update data:", updateData);
      return NextResponse.json(
        { 
          error: "Failed to grade quiz",
          details: updateError.message,
          code: updateError.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt,
      score: totalScore,
      max_score: maxScore,
      graded_answers: gradedAnswers,
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/quiz-attempts/[id]/grade:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to grade quiz" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quiz-attempts/[id]/grade
 * Get quiz attempt with grading details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get quiz attempt with quiz and student info
    const { data: attempt, error: attemptError } = await (supabase
      .from("quiz_attempts") as any)
      .select(`
        *,
        quizzes:quiz_id (
          id,
          title,
          description,
          questions,
          google_classroom_quiz_id
        ),
        students:student_id (
          id,
          full_name,
          email
        )
      `)
      .eq("id", params.id)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Quiz attempt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ attempt });
  } catch (error: any) {
    console.error("Error in GET /api/quiz-attempts/[id]/grade:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch quiz attempt" },
      { status: 500 }
    );
  }
}

