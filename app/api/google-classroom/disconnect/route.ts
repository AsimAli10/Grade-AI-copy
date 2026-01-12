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

      // Get all assignments for these courses (to get assignment IDs for submissions deletion)
      const { data: assignments, error: assignmentsFetchError } = await (supabase
        .from("assignments") as any)
        .select("id")
        .in("course_id", courseIds);

      if (assignmentsFetchError) {
        console.error("Error fetching assignments:", assignmentsFetchError);
      }

      // Delete submissions for assignments in these courses (even if assignments query failed)
      // First try to delete by assignment IDs if we have them
      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map((a: any) => a.id);
        const { error: submissionsError } = await (supabase
          .from("submissions") as any)
          .delete()
          .in("assignment_id", assignmentIds);

        if (submissionsError) {
          console.error("Error deleting submissions:", submissionsError);
        }
      } else {
        // If we don't have assignment IDs, delete submissions by joining through assignments
        // This is a fallback - delete all submissions for assignments in these courses
        const { data: allAssignments } = await (supabase
          .from("assignments") as any)
          .select("id")
          .in("course_id", courseIds);

        if (allAssignments && allAssignments.length > 0) {
          const allAssignmentIds = allAssignments.map((a: any) => a.id);
          const { error: submissionsError } = await (supabase
            .from("submissions") as any)
            .delete()
            .in("assignment_id", allAssignmentIds);

          if (submissionsError) {
            console.error("Error deleting submissions (fallback):", submissionsError);
          }
        }
      }

      // Delete assignments for these courses (regardless of whether we found them)
      const { error: assignmentsError } = await (supabase
        .from("assignments") as any)
        .delete()
        .in("course_id", courseIds);

      if (assignmentsError) {
        console.error("Error deleting assignments:", assignmentsError);
      }

      // Delete Google Classroom announcements (forum_messages with google_classroom_announcement_id)
      // First get forum IDs for these courses
      const { data: courseForums } = await (supabase
        .from("forums") as any)
        .select("id")
        .in("course_id", courseIds);

      if (courseForums && courseForums.length > 0) {
        const forumIds = courseForums.map((f: any) => f.id);
        
        // Delete forum messages that are Google Classroom announcements
        const { error: announcementsError } = await (supabase
          .from("forum_messages") as any)
          .delete()
          .in("forum_id", forumIds)
          .not("google_classroom_announcement_id", "is", null);

        if (announcementsError) {
          console.error("Error deleting Google Classroom announcements:", announcementsError);
        }

        // Delete the forums themselves (they were created for GC announcements)
        const { error: forumsError } = await (supabase
          .from("forums") as any)
          .delete()
          .in("id", forumIds);

        if (forumsError) {
          console.error("Error deleting forums:", forumsError);
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

