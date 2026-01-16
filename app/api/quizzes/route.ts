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

    // Get user's active courses (filter out inactive Google Classroom courses)
    const { data: courses } = await (supabase
      .from("courses") as any)
      .select("id")
      .eq("teacher_id", session.user.id)
      .eq("is_active", true);

    const courseIds = courses?.map((c: any) => c.id) || [];

    if (courseIds.length === 0) {
      return NextResponse.json({ quizzes: [] });
    }

    // Fetch quizzes for user's courses (include questions field to count them)
    const { data: quizzes, error } = await (supabase
      .from("quizzes") as any)
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
      questions,
      time_limit_minutes,
      post_to_google_classroom,
      // Legacy fields for backward compatibility
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
      .select("id, teacher_id, google_classroom_course_id")
      .eq("id", course_id)
      .eq("teacher_id", session.user.id)
      .maybeSingle();

    if (!course) {
      return NextResponse.json(
        { error: "Course not found or access denied" },
        { status: 403 }
      );
    }

    // Use provided questions or empty array (for legacy AI flow)
    const quizQuestions = questions || [];

    // Calculate total points from questions
    const totalPoints = quizQuestions.reduce(
      (sum: number, q: any) => sum + (parseInt(q.points) || 1),
      0
    );

    const { data: quiz, error: insertError } = await (supabase
      .from("quizzes") as any)
      .insert({
        course_id,
        created_by: session.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        questions: quizQuestions,
        time_limit_minutes: time_limit_minutes
          ? parseInt(time_limit_minutes)
          : timeLimit
          ? parseInt(timeLimit)
          : null,
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

    let googleClassroomQuizId: string | null = null;

    // If course is linked to Google Classroom and user wants to post it
    if (post_to_google_classroom && course.google_classroom_course_id) {
      try {
        // Get Google Classroom integration for the teacher
        const { data: integration, error: intError } = await (supabase
          .from("google_classroom_integrations") as any)
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!intError && integration) {
          // Check if token is expired and refresh if needed
          let accessToken = integration.access_token;
          const tokenExpiresAt = new Date(integration.token_expires_at);
          const now = new Date();

          if (tokenExpiresAt <= now) {
            const { refreshAccessToken } = await import("@/utils/google-classroom");
            const refreshed = await refreshAccessToken(integration.refresh_token);
            accessToken = refreshed.access_token;

            // Update stored token
            await (supabase
              .from("google_classroom_integrations") as any)
              .update({
                access_token: refreshed.access_token,
                token_expires_at: new Date(refreshed.expiry_date).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", session.user.id);
          }

          // Create quiz in Google Classroom as question item
          // For single question quizzes, create as question item (MULTIPLE_CHOICE_QUESTION or SHORT_ANSWER_QUESTION)
          // This makes it appear as a quiz question in Google Classroom instead of an assignment
          const { getAuthenticatedClient, getClassroomClient } = await import("@/utils/google-classroom");
          const oauth2Client = getAuthenticatedClient(
            accessToken,
            integration.refresh_token
          );
          const classroom = getClassroomClient(oauth2Client);

          // Determine work type based on first question
          const firstQuestion = quizQuestions.length > 0 ? quizQuestions[0] : null;
          let workType = "ASSIGNMENT"; // Default fallback
          let requestBody: any = {
            title: title.trim(),
            description: description || null,
            maxPoints: totalPoints || 100,
            state: "PUBLISHED",
          };

          if (firstQuestion) {
            if (firstQuestion.type === "multiple_choice" || firstQuestion.type === "true_false") {
              workType = "MULTIPLE_CHOICE_QUESTION";
              requestBody = {
                title: title.trim(),
                description: description || null,
                maxPoints: totalPoints || 100,
                state: "PUBLISHED",
                workType: "MULTIPLE_CHOICE_QUESTION",
                multipleChoiceQuestion: {
                  choices: firstQuestion.options || ["True", "False"],
                },
              };
            } else if (firstQuestion.type === "short_answer") {
              workType = "SHORT_ANSWER_QUESTION";
              requestBody = {
                title: title.trim(),
                description: description || null,
                maxPoints: totalPoints || 100,
                state: "PUBLISHED",
                workType: "SHORT_ANSWER_QUESTION",
              };
            } else {
              // Fallback to assignment with description
              const gcDescription = description
                ? `${description}\n\nQuestions:\n${quizQuestions
                    .map((q: any, idx: number) => `${idx + 1}. ${q.question}`)
                    .join("\n")}`
                : `Quiz: ${title}\n\nQuestions:\n${quizQuestions
                    .map((q: any, idx: number) => `${idx + 1}. ${q.question}`)
                    .join("\n")}`;
              requestBody = {
                title: title.trim(),
                description: gcDescription,
                workType: "ASSIGNMENT",
                maxPoints: totalPoints || 100,
                state: "PUBLISHED",
              };
            }
          } else {
            // No questions - create as assignment with description
            requestBody = {
              title: title.trim(),
              description: description || `Quiz: ${title}`,
              workType: "ASSIGNMENT",
              maxPoints: totalPoints || 100,
              state: "PUBLISHED",
            };
          }

          const courseworkResponse = await classroom.courses.courseWork.create({
            courseId: course.google_classroom_course_id,
            requestBody: requestBody,
          });

          if (courseworkResponse.data && courseworkResponse.data.id) {
            googleClassroomQuizId = courseworkResponse.data.id;

            // Update quiz with Google Classroom ID and mark as published
            // If it's posted to Google Classroom, it should be published in GradeAI too
            await (supabase
              .from("quizzes") as any)
              .update({
                google_classroom_quiz_id: googleClassroomQuizId,
                is_published: true, // Mark as published when posted to Google Classroom
                updated_at: new Date().toISOString(),
              })
              .eq("id", quiz.id);
          }
        }
      } catch (gcError: any) {
        // Log error but don't fail the quiz creation
        console.error("Error posting to Google Classroom:", gcError);
        // Quiz is still created in GradeAI, just not synced to GCR
      }
    }

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        google_classroom_quiz_id: googleClassroomQuizId,
      },
      postedToGoogleClassroom: !!googleClassroomQuizId,
      message: useAI
        ? "Quiz created. AI generation will be implemented soon."
        : "Quiz created successfully.",
    });
  } catch (error: any) {
    console.error("Error in POST /api/quizzes:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create quiz" },
      { status: 500 }
    );
  }
}

