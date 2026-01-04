import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";
import {
  getAuthenticatedClient,
  refreshAccessToken,
  fetchGoogleClassroomCourses,
  fetchCourseStudents,
  fetchCoursework,
} from "@/utils/google-classroom";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/google-classroom/sync
 * Syncs courses, students, and assignments from Google Classroom
 */
export async function POST(request: NextRequest) {
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

    // Get stored integration
    const { data: integration, error: integrationError } = await (supabase
      .from("google_classroom_integrations") as any)
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "Google Classroom not connected. Please connect first." },
        { status: 400 }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = integration.access_token;
    const tokenExpiresAt = new Date(integration.token_expires_at);
    const now = new Date();

    if (tokenExpiresAt <= now) {
      try {
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
      } catch (refreshError) {
        return NextResponse.json(
          { error: "Failed to refresh access token. Please reconnect Google Classroom." },
          { status: 401 }
        );
      }
    }

    // Create authenticated client
    const oauth2Client = getAuthenticatedClient(
      accessToken,
      integration.refresh_token
    );

    // Update sync status
    await (supabase
      .from("google_classroom_integrations") as any)
      .update({
        sync_status: "syncing",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id);

    // Fetch courses from Google Classroom
    const googleCourses = await fetchGoogleClassroomCourses(oauth2Client);

    let syncedCount = 0;
    let errorCount = 0;

    // Sync each course
    for (const googleCourse of googleCourses) {
      try {
        if (!googleCourse.id) continue;

        // Check if course already exists
        const { data: existingCourse } = await (supabase
          .from("courses") as any)
          .select("id")
          .eq("google_classroom_course_id", googleCourse.id)
          .maybeSingle();

        // Prepare course data
        const courseData = {
          teacher_id: session.user.id,
          google_classroom_course_id: googleCourse.id,
          name: googleCourse.name || "Untitled Course",
          description: googleCourse.description || null,
          subject: (googleCourse.section as any)?.heading || null,
          section: (googleCourse.section as any)?.name || null,
          room: googleCourse.room || null,
          enrollment_code: googleCourse.enrollmentCode || null,
          is_active: googleCourse.courseState === "ACTIVE",
          updated_at: new Date().toISOString(),
        };

        let courseId: string;
        if (existingCourse) {
          // Update existing course
          courseId = (existingCourse as any).id;
          await (supabase
            .from("courses") as any)
            .update(courseData)
            .eq("id", (existingCourse as any).id);
        } else {
          // Create new course
          const { data: newCourse, error: courseError } = await (supabase
            .from("courses") as any)
            .insert({
              ...courseData,
              student_count: 0,
            })
            .select()
            .single();

          if (courseError) {
            console.error("Error creating course:", courseError);
            errorCount++;
            continue;
          }

          courseId = (newCourse as any).id;
          // Fetch and sync students only for new courses
          try {
            const students = await fetchCourseStudents(oauth2Client, googleCourse.id);
            
            for (const student of students) {
              if (!student.profile?.id) continue;

              // Find or create student profile
              const { data: studentProfile } = await (supabase
                .from("profiles") as any)
                .select("id")
                .eq("google_classroom_id", student.profile.id)
                .maybeSingle();

              let studentId: string;

              if (studentProfile) {
                studentId = (studentProfile as any).id;
              } else {
                // Create student profile
                const { data: newStudent, error: studentError } = await (supabase
                  .from("profiles") as any)
                  .insert({
                    email: student.profile.emailAddress || "",
                    full_name: `${student.profile.name?.givenName || ""} ${student.profile.name?.familyName || ""}`.trim(),
                    role: "student",
                    google_classroom_id: student.profile.id,
                    google_email: student.profile.emailAddress || null,
                  })
                  .select()
                  .single();

                if (studentError) {
                  console.error("Error creating student:", studentError);
                  continue;
                }
                studentId = (newStudent as any).id;
              }

              // Create enrollment
              await (supabase
                .from("course_enrollments") as any)
                .upsert(
                  {
                    course_id: courseId,
                    student_id: studentId,
                    google_classroom_user_id: student.profile.id,
                    enrollment_status: "active",
                  },
                  {
                    onConflict: "course_id,student_id",
                  }
                );
            }

            // Update student count
            const { count } = await (supabase
              .from("course_enrollments") as any)
              .select("*", { count: "exact", head: true })
              .eq("course_id", courseId);

            await (supabase
              .from("courses") as any)
              .update({ student_count: count || 0 })
              .eq("id", courseId);
          } catch (studentError) {
            console.error("Error syncing students:", studentError);
          }
        }

        // Fetch and sync coursework (assignments) for both new and existing courses
        try {
          const coursework = await fetchCoursework(oauth2Client, googleCourse.id);
          
          for (const work of coursework) {
            if (!work.id) continue;

            await (supabase
              .from("assignments") as any)
              .upsert(
                {
                  course_id: courseId,
                  google_classroom_assignment_id: work.id,
                  title: work.title || "Untitled Assignment",
                  description: work.description || null,
                  max_points: work.maxPoints?.value || 100,
                  due_date: work.dueDate ? new Date(
                    `${work.dueDate.year}-${work.dueDate.month}-${work.dueDate.day}T${work.dueTime?.hours || 23}:${work.dueTime?.minutes || 59}:00`
                  ).toISOString() : null,
                  assignment_type: "essay", // Default, can be enhanced
                  sync_status: "synced",
                  last_sync_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                {
                  onConflict: "google_classroom_assignment_id",
                }
              );
          }
        } catch (courseworkError) {
          console.error("Error syncing coursework:", courseworkError);
        }

        syncedCount++;
      } catch (courseError) {
        console.error("Error syncing course:", courseError);
        errorCount++;
      }
    }

    // Update sync status
    await (supabase
      .from("google_classroom_integrations") as any)
      .update({
        sync_status: "synced",
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      total: googleCourses.length,
    });
  } catch (error: any) {
    console.error("Error syncing Google Classroom:", error);
    
    // Update sync status to error
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      await (supabase
        .from("google_classroom_integrations") as any)
        .update({
          sync_status: "error",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id);
    }

    return NextResponse.json(
      { error: error?.message || "Failed to sync Google Classroom" },
      { status: 500 }
    );
  }
}


