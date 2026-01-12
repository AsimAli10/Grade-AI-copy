import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  getAuthenticatedClient,
  refreshAccessToken,
  fetchGoogleClassroomCourses,
  fetchCourseStudents,
  fetchCoursework,
  fetchStudentSubmissions,
  getClassroomClient,
} from "@/utils/google-classroom";

/**
 * Find or create an auth user for a student profile
 * Returns the user ID or null if creation fails
 * Handles case where student email matches existing teacher account
 */
async function findOrCreateStudentAuthUser(
  adminClient: ReturnType<typeof createClient<Database>>,
  email: string,
  googleClassroomId: string,
  currentTeacherId: string
): Promise<string | null> {
  try {
    // First, check if an auth user with this email already exists
    const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (!listError && existingUsers?.users) {
      const existingUser = existingUsers.users.find(u => u.email === email);
      
      if (existingUser) {
        // Check if this is the current teacher
        const isTeacher = existingUser.id === currentTeacherId;
        
        // Check if profile exists
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("id, role")
          .eq("id", existingUser.id)
          .maybeSingle();
        
        if (existingProfile) {
          // Type assertion needed because generated types may not include role
          // The role column exists in the database but may not be in generated types
          // Use double assertion through 'unknown' to bypass type checking
          const profile = existingProfile as unknown as { id: string; role?: "admin" | "teacher" | "student" };
          
          // Only update role to student if it's not the teacher account
          // Teachers can be enrolled but should keep their teacher role
          if (!isTeacher && profile.role !== "student") {
            await adminClient
              .from("profiles")
              .update({ 
                role: "student",
                google_classroom_id: googleClassroomId,
                google_email: email,
              })
              .eq("id", existingUser.id);
          } else if (isTeacher) {
            // Update Google Classroom ID but keep teacher role
            await adminClient
              .from("profiles")
              .update({ 
                google_classroom_id: googleClassroomId,
                google_email: email,
              })
              .eq("id", existingUser.id);
          }
          return existingUser.id;
        } else {
          // Profile doesn't exist, create it
          const { error: profileError } = await adminClient
            .from("profiles")
            .insert({
              id: existingUser.id,
              email: email,
              role: "student",
              google_classroom_id: googleClassroomId,
              google_email: email,
            });
          
          if (profileError) {
            console.error(`[SYNC ERROR] Failed to create profile for existing auth user ${email}:`, profileError);
            return null;
          }
          return existingUser.id;
        }
      }
    }
    
    // No existing user found, create new one
    // Generate a random password (students won't use it, but it's required)
    const randomPassword = `temp_${Math.random().toString(36).slice(2)}${Date.now()}`;
    
    // Create auth user via admin API
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: email || `student_${googleClassroomId}@classroom.local`,
      password: randomPassword,
      email_confirm: true, // Auto-confirm email so they don't need to verify
      user_metadata: {
        google_classroom_id: googleClassroomId,
        role: "student",
      },
    });

    if (authError || !authUser?.user) {
      console.error(`[SYNC ERROR] Failed to create auth user for ${email}:`, authError);
      return null;
    }

    // Wait for trigger to create profile, then update it
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Update the profile created by trigger to set role to student
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        role: "student",
        google_classroom_id: googleClassroomId,
        google_email: email,
      })
      .eq("id", authUser.user.id);

    if (updateError) {
      console.error(`[SYNC ERROR] Failed to update profile role for ${email}:`, updateError);
      // Don't fail - profile exists, just wrong role
    }

    return authUser.user.id;
  } catch (error) {
    console.error(`[SYNC ERROR] Exception creating/finding auth user for ${email}:`, error);
    return null;
  }
}

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

    // Create admin client to bypass RLS for student profile creation
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[SYNC ERROR] Missing SUPABASE_SERVICE_ROLE_KEY - cannot create student profiles");
      return NextResponse.json(
        { error: "Server configuration error. SUPABASE_SERVICE_ROLE_KEY environment variable is missing. Please add it to your .env.local file. Get it from Supabase Dashboard → Settings → API → service_role key." },
        { status: 500 }
      );
    }
    
    // Check if they're using the publishable key (starts with sb_publishable_)
    if (SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_')) {
      console.error("[SYNC ERROR] Wrong key type - using publishable key instead of service role key");
      return NextResponse.json(
        { 
          error: "Wrong key type! You're using the publishable key instead of the service role key. Go to Supabase Dashboard → Settings → API and copy the 'service_role' key (not the 'publishable' key)." 
        },
        { status: 500 }
      );
    }
    
    // Check if they accidentally used the anon key (common mistake)
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (SUPABASE_SERVICE_ROLE_KEY === SUPABASE_ANON_KEY) {
      console.error("[SYNC ERROR] Service role key is the same as anon key - using wrong key");
      return NextResponse.json(
        { error: "Server configuration error. You're using the anon key instead of the service role key. Get the service_role key from Supabase Dashboard → Settings → API." },
        { status: 500 }
      );
    }

    // Create admin client with service role key
    // The service role key is passed as the second parameter and Supabase automatically uses it for admin operations
    const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Verify admin client works by testing it
    try {
      const { data: testUsers, error: testError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (testError) {
        console.error("[SYNC ERROR] Admin client test failed:", testError);
        return NextResponse.json(
          { error: "Server configuration error. Invalid service role key. Please check SUPABASE_SERVICE_ROLE_KEY environment variable." },
          { status: 500 }
        );
      }
    } catch (testErr: any) {
      console.error("[SYNC ERROR] Admin client initialization failed:", testErr);
      return NextResponse.json(
        { error: "Server configuration error. Cannot initialize admin client." },
        { status: 500 }
      );
    }

    // Safety check: Verify this Google Classroom isn't connected to another user
    const { data: otherIntegration } = await adminClient
      .from("google_classroom_integrations")
      .select("user_id")
      .eq("google_classroom_id", integration.google_classroom_id)
      .neq("user_id", session.user.id)
      .maybeSingle();

    if (otherIntegration) {
      return NextResponse.json(
        { error: "This Google Classroom account is already connected. Please disconnect the existing connection first." },
        { status: 403 }
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
    let skippedCount = 0;
    let conflictDetected = false;
    let studentsSynced = 0;
    let submissionsSynced = 0;
    let assignmentsSynced = 0;

    // Sync each course
    for (const googleCourse of googleCourses) {
      try {
        if (!googleCourse.id) continue;

        // Check if course already exists
        const { data: existingCourse } = await (supabase
          .from("courses") as any)
          .select("id, teacher_id")
          .eq("google_classroom_course_id", googleCourse.id)
          .maybeSingle();

        // If course exists but belongs to a different teacher, skip it
        if (existingCourse && (existingCourse as any).teacher_id !== session.user.id) {
          skippedCount++;
          conflictDetected = true;
          continue;
        }

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
          is_active: true, // Reactivate when syncing
          updated_at: new Date().toISOString(),
        };

        let courseId: string;
        if (existingCourse) {
          // Update existing course (only if it belongs to current user)
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
        }

        // Fetch and sync students for both new and existing courses
        try {
          const students = await fetchCourseStudents(oauth2Client, googleCourse.id);
          
          let courseStudentsSynced = 0;
          for (const student of students) {
            if (!student.profile?.id) continue;

            // Find or create student profile using admin client to bypass RLS
            const { data: studentProfile } = await adminClient
              .from("profiles")
              .select("id")
              .eq("google_classroom_id", student.profile.id)
              .maybeSingle();

            let studentId: string;

            if (studentProfile) {
              studentId = studentProfile.id;
            } else {
              // Find or create auth user (handles case where email matches existing account)
              const studentEmail = student.profile.emailAddress || `student_${student.profile.id}@classroom.local`;
              const authUserId = await findOrCreateStudentAuthUser(
                adminClient, 
                studentEmail, 
                student.profile.id,
                session.user.id // Pass current teacher ID to avoid using their account
              );
              
              if (!authUserId) {
                continue;
              }

              // Update profile with full name if not already set
              const fullName = `${student.profile.name?.givenName || ""} ${student.profile.name?.familyName || ""}`.trim() || "Student";
              const { error: updateError } = await adminClient
                .from("profiles")
                .update({
                  full_name: fullName,
                  google_classroom_id: student.profile.id,
                  google_email: student.profile.emailAddress || null,
                })
                .eq("id", authUserId);

              if (updateError) {
                console.error(`[SYNC ERROR] Error updating student profile for ${studentEmail}:`, updateError);
                // Continue anyway - profile exists
              }
              
              studentId = authUserId;
            }

            // Create or update enrollment using admin client
            // Type assertion needed because course_enrollments table is not in generated types
            const { error: enrollmentError } = await ((adminClient as any)
              .from("course_enrollments"))
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

              if (enrollmentError) {
                console.error(`[SYNC ERROR] Error creating enrollment for student ${studentId} in course ${courseId}:`, enrollmentError);
              } else {
                courseStudentsSynced++;
              }
          }
          
          studentsSynced += courseStudentsSynced;

          // Update student count (trigger should handle this, but ensure it's updated)
          const { count } = await (supabase
            .from("course_enrollments") as any)
            .select("*", { count: "exact", head: true })
            .eq("course_id", courseId)
            .eq("enrollment_status", "active");

          await (supabase
            .from("courses") as any)
            .update({ student_count: count || 0 })
            .eq("id", courseId);
        } catch (studentError) {
          console.error("[SYNC ERROR] Error syncing students:", studentError);
        }

        // Fetch and sync coursework (assignments) for both new and existing courses
        try {
          const coursework = await fetchCoursework(oauth2Client, googleCourse.id);
          
          let courseAssignmentsSynced = 0;
          for (const work of coursework) {
            if (!work.id) continue;

            // First check if assignment exists
            const { data: existingAssignment } = await (supabase
              .from("assignments") as any)
              .select("id")
              .eq("google_classroom_assignment_id", work.id)
              .maybeSingle();

            let assignmentId: string;
            if (existingAssignment) {
              assignmentId = existingAssignment.id;
              // Update existing assignment
              await (supabase
                .from("assignments") as any)
                .update({
                  title: work.title || "Untitled Assignment",
                  description: work.description || null,
                  max_points: work.maxPoints?.value || 100,
                  due_date: work.dueDate ? new Date(
                    `${work.dueDate.year}-${work.dueDate.month}-${work.dueDate.day}T${work.dueTime?.hours || 23}:${work.dueTime?.minutes || 59}:00`
                  ).toISOString() : null,
                  sync_status: "synced",
                  last_sync_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", assignmentId);
            } else {
              // Create new assignment
              const { data: newAssignment, error: assignmentError } = await (supabase
                .from("assignments") as any)
                .insert({
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
                })
                .select()
                .single();

              if (assignmentError || !newAssignment) {
                console.error("Error creating assignment:", assignmentError);
                continue;
              }
              assignmentId = newAssignment.id;
            }

            // Sync submissions for this assignment
            if (assignmentId) {
              try {
                const googleSubmissions = await fetchStudentSubmissions(
                  oauth2Client,
                  googleCourse.id,
                  work.id
                );

                let assignmentSubmissionsSynced = 0;
                for (const googleSubmission of googleSubmissions) {
                  if (!googleSubmission.id || !googleSubmission.userId) continue;

                  // Find student by Google Classroom ID using admin client
                  let { data: studentProfile } = await adminClient
                    .from("profiles")
                    .select("id")
                    .eq("google_classroom_id", googleSubmission.userId)
                    .maybeSingle();

                  // If student profile doesn't exist, try to create it
                  if (!studentProfile) {
                    // Try to get student info from Google Classroom
                    try {
                      const classroom = getClassroomClient(oauth2Client);
                      const studentInfo = await classroom.userProfiles.get({
                        userId: googleSubmission.userId,
                      });

                      if (studentInfo.data) {
                        const studentEmail = studentInfo.data.emailAddress || `student_${googleSubmission.userId}@classroom.local`;
                        
                        // Find or create auth user (handles case where email matches existing account)
                        const authUserId = await findOrCreateStudentAuthUser(
                          adminClient, 
                          studentEmail, 
                          googleSubmission.userId,
                          session.user.id // Pass current teacher ID to avoid using their account
                        );
                        
                        if (!authUserId) {
                          continue;
                        }

                        // Update profile with full name
                        const fullName = `${studentInfo.data.name?.givenName || ""} ${studentInfo.data.name?.familyName || ""}`.trim() || "Student";
                        const { error: updateError } = await adminClient
                          .from("profiles")
                          .update({
                            full_name: fullName,
                            google_classroom_id: googleSubmission.userId,
                            google_email: studentInfo.data.emailAddress || null,
                          })
                          .eq("id", authUserId);

                        if (updateError) {
                          console.error(`[SYNC ERROR] Error updating student profile for ${studentEmail}:`, updateError);
                          // Continue anyway - profile exists
                        }

                        studentProfile = { id: authUserId };
                      } else {
                        continue;
                      }
                    } catch (profileError) {
                      console.error(`[SYNC ERROR] Error fetching student profile from Google:`, profileError);
                      continue;
                    }
                  }

                  // Extract submission content
                  const content = googleSubmission.assignmentSubmission?.attachments
                    ?.map((att: any) => {
                      if (att.driveFile) return att.driveFile.title;
                      if (att.form) return "Form submission";
                      if (att.link) return att.link.url;
                      if (att.youtubeVideo) return att.youtubeVideo.title;
                      return null;
                    })
                    .filter(Boolean)
                    .join(", ") || null;

                  const fileUrls: string[] = googleSubmission.assignmentSubmission?.attachments
                    ?.map((att: any) => {
                      if (att.driveFile?.driveFile?.alternateLink) return att.driveFile.driveFile.alternateLink;
                      if (att.link?.url) return att.link.url;
                      return null;
                    })
                    .filter(Boolean) || [];

                  // Determine submission status
                  let status = "draft";
                  if (googleSubmission.state === "TURNED_IN") {
                    status = "submitted";
                  } else if (googleSubmission.state === "RETURNED") {
                    status = "returned";
                  }

                  // Upsert submission using admin client to bypass RLS
                  // Type assertion needed because submissions table is not in generated types
                  const { error: submissionUpsertError } = await ((adminClient as any)
                    .from("submissions"))
                    .upsert(
                      {
                        assignment_id: assignmentId,
                        student_id: studentProfile.id,
                        google_classroom_submission_id: googleSubmission.id,
                        content: content,
                        file_urls: fileUrls,
                        status: status,
                        submitted_at: googleSubmission.submissionHistory?.[0]?.stateHistory?.[0]?.stateTimestamp
                          ? new Date(googleSubmission.submissionHistory[0].stateHistory[0].stateTimestamp).toISOString()
                          : new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      },
                      {
                        onConflict: "assignment_id,student_id",
                      }
                    );

                  if (submissionUpsertError) {
                    console.error(`[SYNC ERROR] Error upserting submission ${googleSubmission.id}:`, submissionUpsertError);
                  } else {
                    assignmentSubmissionsSynced++;
                  }
                }
                
                submissionsSynced += assignmentSubmissionsSynced;
              } catch (submissionError) {
                console.error(`[SYNC ERROR] Error syncing submissions for assignment ${work.id}:`, submissionError);
              }
            }
            
            courseAssignmentsSynced++;
          }
          
          assignmentsSynced += courseAssignmentsSynced;
        } catch (courseworkError) {
          console.error("[SYNC ERROR] Error syncing coursework:", courseworkError);
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

    // If we detected conflicts (courses belong to another teacher), return an error
    if (conflictDetected) {
      if (syncedCount === 0) {
        // All courses belong to another user - this is a critical error
        return NextResponse.json(
          { 
            error: "This Google Classroom account is already connected. The courses could not be synced. Please disconnect the existing connection first.",
            synced: syncedCount,
            skipped: skippedCount,
            errors: errorCount,
            total: googleCourses.length,
          },
          { status: 403 }
        );
      } else {
        // Some courses synced, but some were skipped - return warning
        return NextResponse.json(
          { 
            error: `Some courses could not be synced. ${syncedCount} course(s) synced, ${skippedCount} skipped.`,
            synced: syncedCount,
            skipped: skippedCount,
            errors: errorCount,
            total: googleCourses.length,
          },
          { status: 200 } // Still return 200 but with error message
        );
      }
    }


    return NextResponse.json({
      success: true,
      synced: syncedCount,
      skipped: skippedCount || 0,
      errors: errorCount,
      total: googleCourses.length,
      studentsSynced,
      assignmentsSynced,
      submissionsSynced,
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


