import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/quizzes
 * Get all quizzes for the authenticated teacher
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's courses
    const { data: courses } = await (supabase
      .from("courses") as any)
      .select("id")
      .eq("teacher_id", session.user.id);

    const courseIds = courses?.map((c: any) => c.id) || [];

    if (courseIds.length === 0) {
      return NextResponse.json({ quizzes: [] });
    }

    // Fetch quizzes for user's courses
    const { data: quizzes, error } = await (supabase
      .from("quizzes") as any)
      .select(`
        id,
        title,
        description,
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
      .in("course_id", courseIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching quizzes:", error);
      return NextResponse.json(
        { error: "Failed to fetch quizzes" },
        { status: 500 }
      );
    }

    // Transform data
    const transformedQuizzes = (quizzes || []).map((quiz: any) => ({
      id: quiz.id,
      title: quiz.title,
      courseName: quiz.courses?.name || "Unknown Course",
      courseId: quiz.course_id,
      questionsCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
      published: quiz.is_published,
      createdAt: quiz.created_at,
      timeLimit: quiz.time_limit_minutes,
      maxAttempts: quiz.max_attempts,
    }));

    return NextResponse.json({ quizzes: transformedQuizzes });
  } catch (error: any) {
    console.error("Error in GET /api/quizzes:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quizzes
 * Create a new quiz
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      course_id,
      description,
      topic,
      difficulty,
      questionCount,
      timeLimit,
      instructions,
      useAI,
    } = body;

    if (!title || !course_id) {
      return NextResponse.json(
        { error: "Title and course_id are required" },
        { status: 400 }
      );
    }

    // Verify course belongs to teacher
    const { data: course } = await (supabase
      .from("courses") as any)
      .select("id")
      .eq("id", course_id)
      .eq("teacher_id", session.user.id)
      .maybeSingle();

    if (!course) {
      return NextResponse.json(
        { error: "Course not found or access denied" },
        { status: 403 }
      );
    }

    // For now, if useAI is true, we'll create a placeholder quiz
    // The AI generation will be implemented later
    const questions = useAI
      ? [] // Will be populated by AI generation later
      : []; // Manual quiz creation - questions will be added later

    const { data: quiz, error: insertError } = await (supabase
      .from("quizzes") as any)
      .insert({
        course_id,
        created_by: session.user.id,
        title,
        description: description || `Quiz on ${topic || "course content"}`,
        questions: questions,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
        max_attempts: 1,
        is_published: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating quiz:", insertError);
      return NextResponse.json(
        { error: "Failed to create quiz" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        useAI: useAI || false,
        message: useAI
          ? "Quiz created. AI generation will be implemented soon."
          : "Quiz created successfully.",
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/quizzes:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create quiz" },
      { status: 500 }
    );
  }
}

