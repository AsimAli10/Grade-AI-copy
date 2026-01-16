import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/google-classroom/sync-quiz-grades
 * Sync quiz grade back to Google Classroom
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
    const { attemptId, quizId } = body;

    if (!attemptId || !quizId) {
      return NextResponse.json(
        { error: "Missing attemptId or quizId" },
        { status: 400 }
      );
    }

    // Get quiz attempt
    const { data: attempt, error: attemptError } = await (supabase
      .from("quiz_attempts") as any)
      .select(`
        *,
        quizzes:quiz_id (
          id,
          google_classroom_quiz_id
        ),
        students:student_id (
          id,
          google_classroom_id
        )
      `)
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Quiz attempt not found" },
        { status: 404 }
      );
    }

    const quiz = (attempt.quizzes as any);
    const student = (attempt.students as any);

    if (!attempt.google_classroom_submission_id || !quiz?.google_classroom_quiz_id) {
      return NextResponse.json(
        { error: "Quiz attempt is not linked to Google Classroom" },
        { status: 400 }
      );
    }

    // Get course from quiz
    const { data: quizData, error: quizDataError } = await (supabase
      .from("quizzes") as any)
      .select(`
        id,
        course_id,
        courses:course_id (
          id,
          google_classroom_course_id
        )
      `)
      .eq("id", quizId)
      .maybeSingle();

    if (quizDataError || !quizData) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const course = (quizData.courses as any);
    if (!course?.google_classroom_course_id) {
      return NextResponse.json(
        { error: "Course is not linked to Google Classroom" },
        { status: 400 }
      );
    }

    // Get Google Classroom integration
    const { data: integration, error: intError } = await (supabase
      .from("google_classroom_integrations") as any)
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (intError || !integration) {
      return NextResponse.json(
        { error: "Google Classroom not connected" },
        { status: 400 }
      );
    }

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

    // Update grade in Google Classroom
    const gcCourseId = course.google_classroom_course_id;
    const gcQuizId = quiz.google_classroom_quiz_id;
    const gcSubmissionId = attempt.google_classroom_submission_id;
    const assignedGrade = parseFloat(attempt.score) || 0;

    // First get the current submission to check its state
    const getSubmissionResponse = await fetch(
      `https://classroom.googleapis.com/v1/courses/${gcCourseId}/courseWork/${gcQuizId}/studentSubmissions/${gcSubmissionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!getSubmissionResponse.ok) {
      const errorData = await getSubmissionResponse.json();
      return NextResponse.json(
        { error: `Failed to get submission: ${JSON.stringify(errorData)}` },
        { status: getSubmissionResponse.status }
      );
    }

    const currentSubmission = await getSubmissionResponse.json();

    // Update the grade
    const updateResponse = await fetch(
      `https://classroom.googleapis.com/v1/courses/${gcCourseId}/courseWork/${gcQuizId}/studentSubmissions/${gcSubmissionId}?updateMask=assignedGrade,draftGrade`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedGrade: assignedGrade,
          draftGrade: assignedGrade,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      return NextResponse.json(
        { error: `Failed to update grade: ${JSON.stringify(errorData)}` },
        { status: updateResponse.status }
      );
    }

    const updatedSubmission = await updateResponse.json();

    // If the submission is in TURNED_IN state, return it to the student
    if (currentSubmission.state === "TURNED_IN") {
      const returnResponse = await fetch(
        `https://classroom.googleapis.com/v1/courses/${gcCourseId}/courseWork/${gcQuizId}/studentSubmissions/${gcSubmissionId}:return`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (!returnResponse.ok) {
        const errorData = await returnResponse.json();
        // Don't fail if return fails, grade was already updated
        console.error("Failed to return submission:", errorData);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Quiz grade synced to Google Classroom successfully",
      grade: assignedGrade,
      maxScore: attempt.max_score,
    });
  } catch (error: any) {
    console.error("Error syncing quiz grade to Google Classroom:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sync quiz grade to Google Classroom" },
      { status: 500 }
    );
  }
}

