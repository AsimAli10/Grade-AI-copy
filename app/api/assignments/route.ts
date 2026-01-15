import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/assignments
 * Create a new assignment
 */
export async function POST(request: NextRequest) {
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
    const { course_id, title, description, assignment_type, max_points, due_date, rubric_id, post_to_google_classroom } = body;

    // Validation
    if (!course_id || !title) {
      return NextResponse.json(
        { error: "Course ID and title are required" },
        { status: 400 }
      );
    }

    // Verify course exists and user is the teacher
    const { data: course, error: courseError } = await (supabase
      .from("courses") as any)
      .select("id, teacher_id, google_classroom_course_id")
      .eq("id", course_id)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.teacher_id !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to create assignments for this course" },
        { status: 403 }
      );
    }

    // Create assignment in database
    const { data: assignment, error: insertError } = await (supabase
      .from("assignments") as any)
      .insert({
        course_id,
        title: title.trim(),
        description: description?.trim() || null,
        assignment_type: assignment_type || "essay",
        max_points: max_points || 100,
        due_date: due_date || null,
        rubric_id: rubric_id || null,
        sync_status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating assignment:", insertError);
      return NextResponse.json(
        { error: "Failed to create assignment" },
        { status: 500 }
      );
    }

    let googleClassroomAssignmentId: string | null = null;

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

          // Create assignment in Google Classroom
          const { getAuthenticatedClient, getClassroomClient } = await import("@/utils/google-classroom");
          const oauth2Client = getAuthenticatedClient(
            accessToken,
            integration.refresh_token
          );
          const classroom = getClassroomClient(oauth2Client);

          // Prepare due date/time for Google Classroom
          let dueDate: any = null;
          let dueTime: any = null;
          if (due_date) {
            const dueDateObj = new Date(due_date);
            dueDate = {
              year: dueDateObj.getFullYear(),
              month: dueDateObj.getMonth() + 1,
              day: dueDateObj.getDate(),
            };
            dueTime = {
              hours: dueDateObj.getHours(),
              minutes: dueDateObj.getMinutes(),
            };
          }

          const courseworkResponse = await classroom.courses.courseWork.create({
            courseId: course.google_classroom_course_id,
            requestBody: {
              title: title.trim(),
              description: description?.trim() || "",
              workType: "ASSIGNMENT",
              maxPoints: max_points || 100,
              dueDate: dueDate,
              dueTime: dueTime,
              state: "PUBLISHED",
            },
          });

          if (courseworkResponse.data && courseworkResponse.data.id) {
            googleClassroomAssignmentId = courseworkResponse.data.id;

            // Update assignment with Google Classroom ID
            await (supabase
              .from("assignments") as any)
              .update({
                google_classroom_assignment_id: googleClassroomAssignmentId,
                sync_status: "synced",
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", assignment.id);
          }
        }
      } catch (gcError: any) {
        // Log error but don't fail the assignment creation
        console.error("Error posting to Google Classroom:", gcError);
        // Assignment is still created in GradeAI, just not synced to GCR
      }
    }

    return NextResponse.json({
      success: true,
      assignment: {
        ...assignment,
        google_classroom_assignment_id: googleClassroomAssignmentId,
      },
      postedToGoogleClassroom: !!googleClassroomAssignmentId,
    });
  } catch (error: any) {
    console.error("Error in POST /api/assignments:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create assignment" },
      { status: 500 }
    );
  }
}

