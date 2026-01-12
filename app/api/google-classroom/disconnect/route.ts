import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DELETE /api/google-classroom/disconnect
 * Disconnects Google Classroom integration for the current user
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get authenticated user
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

    // Get all Google Classroom courses for this teacher
    const { data: googleCourses, error: coursesFetchError } = await (supabase
      .from("courses") as any)
      .select("id")
      .eq("teacher_id", session.user.id)
      .not("google_classroom_course_id", "is", null);

    if (coursesFetchError) {
      console.error("Error fetching Google Classroom courses:", coursesFetchError);
    } else if (googleCourses && googleCourses.length > 0) {
      const courseIds = googleCourses.map((c: any) => c.id);

      // Get all assignments for these courses
      const { data: assignments, error: assignmentsFetchError } = await (supabase
        .from("assignments") as any)
        .select("id")
        .in("course_id", courseIds);

      if (assignmentsFetchError) {
        console.error("Error fetching assignments:", assignmentsFetchError);
      } else if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map((a: any) => a.id);

        // Delete submissions for these assignments (cascade will handle grades)
        const { error: submissionsError } = await (supabase
          .from("submissions") as any)
          .delete()
          .in("assignment_id", assignmentIds);

        if (submissionsError) {
          console.error("Error deleting submissions:", submissionsError);
        }

        // Delete assignments
        const { error: assignmentsError } = await (supabase
          .from("assignments") as any)
          .delete()
          .in("course_id", courseIds);

        if (assignmentsError) {
          console.error("Error deleting assignments:", assignmentsError);
        }
      }

      // Delete course enrollments
      const { error: enrollmentsError } = await (supabase
        .from("course_enrollments") as any)
        .delete()
        .in("course_id", courseIds);

      if (enrollmentsError) {
        console.error("Error deleting enrollments:", enrollmentsError);
      }

      // Delete courses (this will cascade delete related data via foreign keys)
      const { error: coursesDeleteError } = await (supabase
        .from("courses") as any)
        .delete()
        .in("id", courseIds);

      if (coursesDeleteError) {
        console.error("Error deleting courses:", coursesDeleteError);
        return NextResponse.json(
          { error: "Failed to delete Google Classroom courses" },
          { status: 500 }
        );
      }
    }

    // Delete the Google Classroom integration
    const { error: deleteError } = await (supabase
      .from("google_classroom_integrations") as any)
      .delete()
      .eq("user_id", session.user.id);

    if (deleteError) {
      console.error("Error disconnecting Google Classroom:", deleteError);
      return NextResponse.json(
        { error: "Failed to disconnect Google Classroom" },
        { status: 500 }
      );
    }

    // Clear google_classroom_id from profile
    await (supabase
      .from("profiles") as any)
      .update({
        google_classroom_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    return NextResponse.json({
      success: true,
      message: "Google Classroom disconnected successfully. All synced data has been removed.",
    });
  } catch (error: any) {
    console.error("Error disconnecting Google Classroom:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to disconnect Google Classroom" },
      { status: 500 }
    );
  }
}

