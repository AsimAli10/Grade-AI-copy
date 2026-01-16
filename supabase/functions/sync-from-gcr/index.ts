// @ts-nocheck
// Deno runtime provides these globals - TypeScript errors are false positives

// ============================================
// SYNC FROM GOOGLE CLASSROOM
// ============================================
// Syncs courses, students, assignments, submissions, quizzes, announcements, and rubrics FROM Google Classroom to GradeAI

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Refresh Google OAuth access token
 */
async function refreshGoogleToken(refreshToken: string, clientId: string, clientSecret: string): Promise<{ access_token: string; expiry_date: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expiry_date: Date.now() + (data.expires_in * 1000),
  };
}

/**
 * Call Google Classroom API
 */
async function callGoogleClassroomAPI(
  accessToken: string,
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `https://classroom.googleapis.com/v1/${cleanEndpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'PATCH' || method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const responseText = await response.text();

  if (!response.ok) {
    let errorDetails;
    try {
      errorDetails = JSON.parse(responseText);
    } catch {
      errorDetails = responseText;
    }
    
    throw new Error(`Google Classroom API error: ${response.status} ${JSON.stringify(errorDetails)}`);
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

/**
 * Call Google Forms API
 */
async function callGoogleFormsAPI(
  accessToken: string,
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `https://forms.googleapis.com/v1/${cleanEndpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'PATCH' || method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const responseText = await response.text();

  if (!response.ok) {
    let errorDetails;
    try {
      errorDetails = JSON.parse(responseText);
    } catch {
      errorDetails = responseText;
    }
    
    throw new Error(`Google Forms API error: ${response.status} ${JSON.stringify(errorDetails)}`);
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

/**
 * Find or create an auth user for a student profile
 * Returns the user ID or null if creation fails
 * Handles case where student email matches existing teacher account
 */
async function findOrCreateStudentAuthUser(
  adminClient: ReturnType<typeof createClient>,
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
          .from('profiles')
          .select('id, role')
          .eq('id', existingUser.id)
          .maybeSingle();
        
        if (existingProfile) {
          const profile = existingProfile as any;
          
          // Only update role to student if it's not the teacher account
          if (!isTeacher && profile.role !== 'student') {
            await adminClient
              .from('profiles')
              .update({ 
                role: 'student',
                google_classroom_id: googleClassroomId,
                google_email: email,
              })
              .eq('id', existingUser.id);
          } else if (isTeacher) {
            // Update Google Classroom ID but keep teacher role
            await adminClient
              .from('profiles')
              .update({ 
                google_classroom_id: googleClassroomId,
                google_email: email,
              })
              .eq('id', existingUser.id);
          }
          return existingUser.id;
        } else {
          // Profile doesn't exist, create it
          const { error: profileError } = await adminClient
            .from('profiles')
            .insert({
              id: existingUser.id,
              email: email,
              role: 'student',
              google_classroom_id: googleClassroomId,
              google_email: email,
            });
          
          if (profileError) {
            return null;
          }
          return existingUser.id;
        }
      }
    }
    
    // No existing user found, create new one
    const randomPassword = `temp_${Math.random().toString(36).slice(2)}${Date.now()}`;
    
    // Create auth user via admin API
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: email || `student_${googleClassroomId}@classroom.local`,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        google_classroom_id: googleClassroomId,
        role: 'student',
      },
    });

    if (authError || !authUser?.user) {
      return null;
    }

    // Wait for trigger to create profile, then update it
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Update the profile created by trigger to set role to student
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        role: 'student',
        google_classroom_id: googleClassroomId,
        google_email: email,
      })
      .eq('id', authUser.user.id);

    if (updateError) {
      return null;
    }

    return authUser.user.id;
  } catch (error) {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !googleClientId || !googleClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get Google Classroom integration
    const { data: integration, error: intError } = await adminClient
      .from('google_classroom_integrations')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Google Classroom not connected' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Ensure teacher's profile has google_classroom_id set
    const { data: teacherProfile } = await adminClient
      .from('profiles')
      .select('id, google_classroom_id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (teacherProfile && !teacherProfile.google_classroom_id) {
      await adminClient
        .from('profiles')
        .update({
          google_classroom_id: integration.google_classroom_id,
        })
        .eq('id', user.id);
    }

    // Check if token is expired and refresh if needed
    let accessToken = integration.access_token;
    const tokenExpiresAt = new Date(integration.token_expires_at);
    const now = new Date();

    if (tokenExpiresAt <= now) {
      try {
        const refreshed = await refreshGoogleToken(
          integration.refresh_token,
          googleClientId,
          googleClientSecret
        );
        accessToken = refreshed.access_token;

        await adminClient
          .from('google_classroom_integrations')
          .update({
            access_token: accessToken,
            token_expires_at: new Date(refreshed.expiry_date).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } catch (refreshError: any) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Google token' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // Update sync status to in_progress
    await adminClient
      .from('google_classroom_integrations')
      .update({
        sync_status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Fetch courses from Google Classroom
    let allCourses: any[] = [];
    let pageToken: string | undefined;
    
    do {
      const coursesResponse = await callGoogleClassroomAPI(
        accessToken,
        'GET',
        `courses?courseStates=ACTIVE&courseStates=ARCHIVED&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`
      );
      
      if (coursesResponse.courses) {
        allCourses.push(...coursesResponse.courses);
      }
      pageToken = coursesResponse.nextPageToken;
    } while (pageToken);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let studentsSynced = 0;
    let assignmentsSynced = 0;
    let submissionsSynced = 0;
    let quizzesSynced = 0;
    let announcementsSynced = 0;

    // Sync each course
    for (const gcCourse of allCourses) {
      try {
        if (!gcCourse.id) continue;

        // Check if course already exists
        const { data: existingCourse } = await adminClient
          .from('courses')
          .select('id, teacher_id')
          .eq('google_classroom_course_id', gcCourse.id)
          .maybeSingle();

        // If course exists but belongs to a different teacher, skip it
        if (existingCourse && (existingCourse as any).teacher_id !== user.id) {
          skippedCount++;
          continue;
        }

        // Prepare course data
        const courseData = {
          teacher_id: user.id,
          google_classroom_course_id: gcCourse.id,
          name: gcCourse.name || 'Untitled Course',
          description: gcCourse.description || null,
          subject: gcCourse.section?.heading || null,
          section: gcCourse.section?.name || null,
          room: gcCourse.room || null,
          enrollment_code: gcCourse.enrollmentCode || null,
          is_active: gcCourse.courseState === 'ACTIVE',
          updated_at: new Date().toISOString(),
        };

        let courseId: string;
        let isNewCourse = false;
        if (existingCourse) {
          courseId = (existingCourse as any).id;
          await (adminClient.from('courses') as any).update(courseData).eq('id', courseId);
        } else {
          isNewCourse = true;
          const { data: newCourse, error: courseError } = await (adminClient.from('courses') as any).insert({
            ...courseData,
            student_count: 0,
          }).select().single();

          if (courseError || !newCourse) {
            errorCount++;
            continue;
          }
          courseId = (newCourse as any).id;
        }

        // Only count if it's a new course
        if (isNewCourse) {
          syncedCount++;
        }

        // Fetch and sync students
        try {
          let allStudents: any[] = [];
          let studentPageToken: string | undefined;
          
          do {
            const studentsResponse = await callGoogleClassroomAPI(
              accessToken,
              'GET',
              `courses/${gcCourse.id}/students?pageSize=100${studentPageToken ? `&pageToken=${studentPageToken}` : ''}`
            );
            
            if (studentsResponse.students) {
              allStudents.push(...studentsResponse.students);
            }
            studentPageToken = studentsResponse.nextPageToken;
          } while (studentPageToken);
          
          let courseStudentsSynced = 0;
          for (const student of allStudents) {
            if (!student.profile?.id) continue;

            // Find or create student profile using admin client
            const { data: studentProfile } = await adminClient
              .from('profiles')
              .select('id')
              .eq('google_classroom_id', student.profile.id)
              .maybeSingle();

            let studentId: string;

            if (studentProfile) {
              studentId = studentProfile.id;
            } else {
              // Find or create auth user
              const studentEmail = student.profile.emailAddress || `student_${student.profile.id}@classroom.local`;
              const authUserId = await findOrCreateStudentAuthUser(
                adminClient,
                studentEmail,
                student.profile.id,
                user.id
              );
              
              if (!authUserId) {
                continue;
              }

              // Update profile with full name
              const fullName = `${student.profile.name?.givenName || ''} ${student.profile.name?.familyName || ''}`.trim() || 'Student';
              await adminClient
                .from('profiles')
                .update({
                  full_name: fullName,
                  google_classroom_id: student.profile.id,
                  google_email: student.profile.emailAddress || null,
                })
                .eq('id', authUserId);
              
              studentId = authUserId;
            }

            // Check if enrollment already exists
            const { data: existingEnrollment } = await (adminClient.from('course_enrollments') as any)
              .select('id')
              .eq('course_id', courseId)
              .eq('student_id', studentId)
              .maybeSingle();

            // Create or update enrollment
            await (adminClient.from('course_enrollments') as any).upsert(
              {
                course_id: courseId,
                student_id: studentId,
                google_classroom_user_id: student.profile.id,
                enrollment_status: 'active',
              },
              {
                onConflict: 'course_id,student_id',
              }
            );

            // Only count if it's a new enrollment
            if (!existingEnrollment) {
              courseStudentsSynced++;
            }
          }
          
          studentsSynced += courseStudentsSynced;

          // Update student count
          const { count } = await (adminClient
            .from('course_enrollments') as any)
            .select('*', { count: 'exact', head: true })
            .eq('course_id', courseId)
            .eq('enrollment_status', 'active');

          await (adminClient.from('courses') as any)
            .update({ student_count: count || 0 })
            .eq('id', courseId);
        } catch (studentError) {
          // Continue even if student sync fails
        }

        // Fetch and sync coursework (assignments)
        try {
          let allCoursework: any[] = [];
          let courseworkPageToken: string | undefined;
          
          do {
            const courseworkResponse = await callGoogleClassroomAPI(
              accessToken,
              'GET',
              `courses/${gcCourse.id}/courseWork?pageSize=100${courseworkPageToken ? `&pageToken=${courseworkPageToken}` : ''}`
            );
            
            if (courseworkResponse.courseWork) {
              allCoursework.push(...courseworkResponse.courseWork);
            }
            courseworkPageToken = courseworkResponse.nextPageToken;
          } while (courseworkPageToken);

          // Filter to only include ASSIGNMENT type coursework
          const assignmentsOnly = allCoursework.filter((work: any) => work.workType === 'ASSIGNMENT');
          
          let courseAssignmentsSynced = 0;
          for (const work of assignmentsOnly) {
            if (!work.id) continue;

            // Fetch full assignment details to get materials/attachments
            let fullWork = work;
            try {
              const fullResponse = await callGoogleClassroomAPI(
                accessToken,
                'GET',
                `courses/${gcCourse.id}/courseWork/${work.id}`
              );
              if (fullResponse) {
                fullWork = fullResponse;
              }
            } catch (getError) {
              // Continue with list response data
            }

            // Extract attachments/materials
            const attachments: any[] = [];
            if (fullWork.materials && Array.isArray(fullWork.materials)) {
              for (const material of fullWork.materials) {
                const attachment: any = {
                  type: null,
                  title: null,
                  url: null,
                };

                if (material.driveFile) {
                  attachment.type = 'drive_file';
                  attachment.title = material.driveFile.driveFile?.title || 'Drive File';
                  attachment.url = material.driveFile.driveFile?.alternateLink || null;
                  attachment.id = material.driveFile.driveFile?.id || null;
                } else if (material.youtubeVideo) {
                  attachment.type = 'youtube_video';
                  attachment.title = material.youtubeVideo.title || 'YouTube Video';
                  attachment.url = material.youtubeVideo.alternateLink || null;
                  attachment.id = material.youtubeVideo.id || null;
                } else if (material.link) {
                  attachment.type = 'link';
                  attachment.title = material.link.title || material.link.url || 'Link';
                  attachment.url = material.link.url || null;
                } else if (material.form) {
                  attachment.type = 'form';
                  attachment.title = 'Google Form';
                  attachment.url = material.form.formUrl || material.form.responseUrl || null;
                  attachment.id = material.form.formId || null;
                }

                if (attachment.type) {
                  attachments.push(attachment);
                }
              }
            }

            // Check if assignment has a rubric
            let rubricId: string | null = null;
            
            try {
              const rubricsResponse = await callGoogleClassroomAPI(
                accessToken,
                'GET',
                `courses/${gcCourse.id}/courseWork/${work.id}/rubrics`
              );
              
              if (rubricsResponse.rubrics && rubricsResponse.rubrics.length > 0) {
                const gcRubric = rubricsResponse.rubrics[0];
                
                // Convert Google Classroom rubric to GradeAI format
                const criteria = gcRubric.criteria || [];
                const totalPoints = criteria.reduce((sum: number, c: any) => {
                  const maxPoints = Math.max(...(c.levels?.map((l: any) => l.points || 0) || [0]), 0);
                  return sum + maxPoints;
                }, 0) || work.maxPoints?.value || 100;

                const convertedCriteria = criteria.map((criterion: any) => {
                  const levels = criterion.levels || [];
                  const maxLevelPoints = Math.max(...levels.map((l: any) => l.points || 0), 0);
                  
                  return {
                    name: criterion.title || 'Criterion',
                    description: criterion.description || '',
                    weight: maxLevelPoints ? (maxLevelPoints / totalPoints) * 100 : 0,
                    max_points: maxLevelPoints,
                    levels: levels.map((level: any) => ({
                      name: level.title || '',
                      points: level.points || 0,
                      description: level.description || '',
                    })),
                  };
                });

                const rubricName = `${work.title || 'Assignment'} - Rubric`;
                const { data: existingRubric } = await (adminClient.from('rubrics') as any)
                  .select('id')
                  .eq('created_by', user.id)
                  .eq('name', rubricName)
                  .maybeSingle();

                if (existingRubric) {
                  await (adminClient.from('rubrics') as any)
                    .update({
                      criteria: convertedCriteria,
                      total_points: totalPoints,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingRubric.id);
                  rubricId = existingRubric.id;
                } else {
                  const { data: newRubric, error: rubricError } = await (adminClient.from('rubrics') as any)
                    .insert({
                      created_by: user.id,
                      name: rubricName,
                      description: `Rubric for ${work.title || 'assignment'}`,
                      criteria: convertedCriteria,
                      total_points: totalPoints,
                      is_template: false,
                    })
                    .select()
                    .single();

                  if (!rubricError && newRubric) {
                    rubricId = (newRubric as any).id;
                  }
                }
              }
            } catch (rubricError) {
              // Rubrics API might not be available
            }
            
            // Check if assignment exists
            const { data: existingAssignment } = await adminClient
              .from('assignments')
              .select('id')
              .eq('google_classroom_assignment_id', work.id)
              .maybeSingle();

            let assignmentId: string;
            let isNewAssignment = false;
            if (existingAssignment) {
              assignmentId = existingAssignment.id;
              await (adminClient.from('assignments') as any).update({
                title: fullWork.title || 'Untitled Assignment',
                description: fullWork.description || null,
                max_points: fullWork.maxPoints?.value || 100,
                due_date: fullWork.dueDate ? new Date(
                  `${fullWork.dueDate.year}-${String(fullWork.dueDate.month).padStart(2, '0')}-${String(fullWork.dueDate.day).padStart(2, '0')}T${String(fullWork.dueTime?.hours || 23).padStart(2, '0')}:${String(fullWork.dueTime?.minutes || 59).padStart(2, '0')}:00`
                ).toISOString() : null,
                rubric_id: rubricId,
                attachments: attachments.length > 0 ? attachments : null,
                sync_status: 'synced',
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('id', assignmentId);
            } else {
              isNewAssignment = true;
              const { data: newAssignment, error: assignmentError } = await (adminClient.from('assignments') as any).insert({
                course_id: courseId,
                google_classroom_assignment_id: fullWork.id,
                title: fullWork.title || 'Untitled Assignment',
                description: fullWork.description || null,
                max_points: fullWork.maxPoints?.value || 100,
                due_date: fullWork.dueDate ? new Date(
                  `${fullWork.dueDate.year}-${String(fullWork.dueDate.month).padStart(2, '0')}-${String(fullWork.dueDate.day).padStart(2, '0')}T${String(fullWork.dueTime?.hours || 23).padStart(2, '0')}:${String(fullWork.dueTime?.minutes || 59).padStart(2, '0')}:00`
                ).toISOString() : null,
                assignment_type: 'essay',
                rubric_id: rubricId,
                attachments: attachments.length > 0 ? attachments : null,
                sync_status: 'synced',
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).select().single();

              if (assignmentError || !newAssignment) {
                continue;
              }
              assignmentId = (newAssignment as any).id;
            }

            // Sync submissions for this assignment
            if (assignmentId) {
              try {
                let allSubmissions: any[] = [];
                let submissionPageToken: string | undefined;
                
                do {
                  const submissionsResponse = await callGoogleClassroomAPI(
                    accessToken,
                    'GET',
                    `courses/${gcCourse.id}/courseWork/${work.id}/studentSubmissions?pageSize=100${submissionPageToken ? `&pageToken=${submissionPageToken}` : ''}`
                  );
                  
                  if (submissionsResponse.studentSubmissions) {
                    allSubmissions.push(...submissionsResponse.studentSubmissions);
                  }
                  submissionPageToken = submissionsResponse.nextPageToken;
                } while (submissionPageToken);

                let assignmentSubmissionsSynced = 0;
                for (const googleSubmission of allSubmissions) {
                  if (!googleSubmission.id || !googleSubmission.userId) continue;
                  
                  const isTurnedIn = googleSubmission.state === 'TURNED_IN' || googleSubmission.state === 'RETURNED';
                  const hasContent = googleSubmission.assignmentSubmission?.attachments && 
                                    googleSubmission.assignmentSubmission.attachments.length > 0;
                  
                  if (!isTurnedIn && !hasContent) {
                    continue;
                  }

                  // Find student by Google Classroom ID
                  let { data: studentProfile } = await adminClient
                    .from('profiles')
                    .select('id')
                    .eq('google_classroom_id', googleSubmission.userId)
                    .maybeSingle();

                  if (!studentProfile) {
                    // Try to get student info from Google Classroom
                    try {
                      const studentInfo = await callGoogleClassroomAPI(
                        accessToken,
                        'GET',
                        `userProfiles/${googleSubmission.userId}`
                      );

                      if (studentInfo) {
                        const studentEmail = studentInfo.emailAddress || `student_${googleSubmission.userId}@classroom.local`;
                        
                        const authUserId = await findOrCreateStudentAuthUser(
                          adminClient,
                          studentEmail,
                          googleSubmission.userId,
                          user.id
                        );
                        
                        if (!authUserId) {
                          continue;
                        }

                        const fullName = `${studentInfo.name?.givenName || ''} ${studentInfo.name?.familyName || ''}`.trim() || 'Student';
                        await adminClient
                          .from('profiles')
                          .update({
                            full_name: fullName,
                            google_classroom_id: googleSubmission.userId,
                            google_email: studentInfo.emailAddress || null,
                          })
                          .eq('id', authUserId);

                        studentProfile = { id: authUserId };
                      } else {
                        continue;
                      }
                    } catch (profileError) {
                      continue;
                    }
                  }

                  // Extract file URLs
                  const assignmentSubmission = googleSubmission.assignmentSubmission;
                  const attachments = assignmentSubmission?.attachments || [];
                  
                  const fileUrls: string[] = attachments
                    .map((att: any) => {
                      let driveFile = att.driveFile?.driveFile || att.driveFile;
                      let alternateLink = driveFile?.alternateLink || att.alternateLink;
                      let fileId = driveFile?.id || att.id;
                      let title = driveFile?.title || att.title || '';
                      
                      if (fileId && !alternateLink) {
                        alternateLink = `https://drive.google.com/file/d/${fileId}/view`;
                      }
                      
                      if (alternateLink && !fileId) {
                        const fileIdMatch = alternateLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                        if (fileIdMatch && fileIdMatch[1]) {
                          fileId = fileIdMatch[1];
                        }
                      }
                      
                      if (fileId) {
                        const isPdf = title.toLowerCase().endsWith('.pdf') || 
                                     alternateLink?.toLowerCase().includes('pdf');
                        
                        if (isPdf) {
                          return `https://drive.google.com/file/d/${fileId}/preview`;
                        } else {
                          return `https://drive.google.com/uc?export=view&id=${fileId}`;
                        }
                      }
                      
                      if (alternateLink) {
                        return alternateLink;
                      }
                      
                      if (att.link?.url) return att.link.url;
                      if (att.youtubeVideo?.alternateLink) return att.youtubeVideo.alternateLink;
                      
                      return null;
                    })
                    .filter(Boolean) || [];

                  let content: string | null = null;
                  if (googleSubmission.assignmentSubmission?.attachments) {
                    const textParts = googleSubmission.assignmentSubmission.attachments
                      .map((att: any) => {
                        if (att.form) return 'Form submission';
                        return null;
                      })
                      .filter(Boolean);
                    
                    if (textParts.length > 0) {
                      content = textParts.join(', ');
                    }
                  }

                  let status = 'draft';
                  if (googleSubmission.state === 'TURNED_IN') {
                    status = 'submitted';
                  } else if (googleSubmission.state === 'RETURNED') {
                    status = 'returned';
                  }

                  // Check if submission already exists
                  const { data: existingSubmission } = await (adminClient.from('submissions') as any)
                    .select('id')
                    .eq('assignment_id', assignmentId)
                    .eq('student_id', studentProfile.id)
                    .maybeSingle();

                  // Upsert submission
                  await (adminClient.from('submissions') as any).upsert(
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
                      onConflict: 'assignment_id,student_id',
                    }
                  );

                  // Only count if it's a new submission
                  if (!existingSubmission) {
                    assignmentSubmissionsSynced++;
                  }
                }
                
                submissionsSynced += assignmentSubmissionsSynced;
              } catch (submissionError) {
                // Continue even if submission sync fails
              }
            }
            
            // Only count if it's a new assignment
            if (isNewAssignment) {
              courseAssignmentsSynced++;
            }
          }
          
          assignmentsSynced += courseAssignmentsSynced;

          // Now sync quizzes
          const quizAssignments: any[] = [];
          
          // Find quiz assignments with forms
          for (const assignment of assignmentsOnly) {
            if (!assignment.id) continue;
            
            try {
              const fullResponse = await callGoogleClassroomAPI(
                accessToken,
                'GET',
                `courses/${gcCourse.id}/courseWork/${assignment.id}`
              );
              
              if (fullResponse?.materials?.some((m: any) => m.form)) {
                quizAssignments.push(fullResponse);
              }
            } catch (getError) {
              if (assignment.materials?.some((m: any) => m.form)) {
                quizAssignments.push(assignment);
              }
            }
          }
          
          // Find standalone question items
          const questionItems = allCoursework.filter((work: any) => 
            work.workType === 'SHORT_ANSWER_QUESTION' || 
            work.workType === 'MULTIPLE_CHOICE_QUESTION'
          );
          
          const quizzesOnly = [...quizAssignments, ...questionItems];

          let courseQuizzesSynced = 0;
          for (const quizWork of quizzesOnly) {
            if (!quizWork.id) continue;

            // Extract questions from the quiz
            const questions: any[] = [];

            // Check if this is a quiz assignment with a form attached
            const formMaterial = quizWork.materials?.find((m: any) => m.form);
            if (formMaterial?.form) {
              const formUrl = formMaterial.form.formUrl || formMaterial.form.responseUrl;
              
              if (formUrl) {
                const formIdMatch = formUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
                if (formIdMatch && formIdMatch[1]) {
                  const formId = formIdMatch[1];
                  
                  // Try to fetch form questions using Forms API
                  try {
                    const formResponse = await callGoogleFormsAPI(
                      accessToken,
                      'GET',
                      `forms/${formId}`
                    );
                    
                    if (formResponse.items) {
                      for (const item of formResponse.items) {
                        if (item.questionItem) {
                          const questionItem = item.questionItem;
                          const questionId = item.itemId || `form_${formId}_${item.title}`;
                          
                          if (questionItem.question?.choiceQuestion) {
                            const choiceQ = questionItem.question.choiceQuestion;
                            const questionText = questionItem.question.questionText || item.title || 'Question';
                            questions.push({
                              id: questionId,
                              type: 'multiple_choice',
                              question: questionText,
                              options: choiceQ.options?.map((opt: any) => opt.value || '') || [],
                              points: 1,
                            });
                          } else if (questionItem.question?.textQuestion) {
                            const questionText = questionItem.question.questionText || item.title || 'Question';
                            questions.push({
                              id: questionId,
                              type: 'short_answer',
                              question: questionText,
                              points: 1,
                            });
                          }
                        }
                      }
                    }
                  } catch (formError) {
                    // Forms API might not be available
                  }
                }
              }
            } else if ((quizWork.workType === 'SHORT_ANSWER_QUESTION' || quizWork.workType === 'MULTIPLE_CHOICE_QUESTION') && questions.length === 0) {
              const questionText = quizWork.title || quizWork.description || 'Question';
              
              if (quizWork.workType === 'MULTIPLE_CHOICE_QUESTION') {
                let options: string[] = [];
                
                if (quizWork.multipleChoiceQuestion) {
                  const mcq = quizWork.multipleChoiceQuestion;
                  options = mcq.choices || [];
                }
                
                questions.push({
                  id: `mcq_${quizWork.id}`,
                  type: 'multiple_choice',
                  question: questionText,
                  options: options,
                  points: quizWork.maxPoints?.value || 1,
                });
              } else if (quizWork.workType === 'SHORT_ANSWER_QUESTION') {
                questions.push({
                  id: `saq_${quizWork.id}`,
                  type: 'short_answer',
                  question: questionText,
                  points: quizWork.maxPoints?.value || 1,
                });
              }
            }
            
            if (questions.length === 0) {
              continue;
            }

            // Check if quiz already exists
            const { data: existingQuiz } = await (adminClient.from('quizzes') as any)
              .select('id')
              .eq('google_classroom_quiz_id', quizWork.id)
              .maybeSingle();

            let quizId: string;
            let isNewQuiz = false;
            if (existingQuiz) {
              quizId = existingQuiz.id;
              await (adminClient.from('quizzes') as any)
                .update({
                  title: quizWork.title || 'Untitled Quiz',
                  description: quizWork.description || null,
                  questions: questions,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', quizId);
            } else {
              isNewQuiz = true;
              const { data: newQuiz, error: quizError } = await (adminClient.from('quizzes') as any)
                .insert({
                  course_id: courseId,
                  created_by: user.id,
                  title: quizWork.title || 'Untitled Quiz',
                  description: quizWork.description || null,
                  questions: questions,
                  time_limit_minutes: null,
                  max_attempts: 1,
                  is_published: quizWork.state === 'PUBLISHED',
                  google_classroom_quiz_id: quizWork.id,
                })
                .select()
                .single();

              if (quizError || !newQuiz) {
                continue;
              }
              quizId = (newQuiz as any).id;
            }

            // Only count if it's a new quiz
            if (isNewQuiz) {
              courseQuizzesSynced++;
            }

            // Sync quiz submissions for question items
            try {
              let allQuizSubmissions: any[] = [];
              let quizSubmissionPageToken: string | undefined;
              
              do {
                const quizSubmissionsResponse = await callGoogleClassroomAPI(
                  accessToken,
                  'GET',
                  `courses/${gcCourse.id}/courseWork/${quizWork.id}/studentSubmissions?pageSize=100${quizSubmissionPageToken ? `&pageToken=${quizSubmissionPageToken}` : ''}`
                );
                
                if (quizSubmissionsResponse.studentSubmissions) {
                  allQuizSubmissions.push(...quizSubmissionsResponse.studentSubmissions);
                }
                quizSubmissionPageToken = quizSubmissionsResponse.nextPageToken;
              } while (quizSubmissionPageToken);

              let quizSubmissionsSynced = 0;
              for (const googleSubmission of allQuizSubmissions) {
                if (!googleSubmission.id || !googleSubmission.userId) continue;
                
                const isTurnedIn = googleSubmission.state === 'TURNED_IN' || googleSubmission.state === 'RETURNED';
                
                if (!isTurnedIn) {
                  continue;
                }

                // Check if this quiz submission already exists to prevent duplicates
                // Use google_classroom_submission_id to check for existing attempts
                if (googleSubmission.id) {
                  const { data: existingAttempt } = await (adminClient.from('quiz_attempts') as any)
                    .select('id')
                    .eq('google_classroom_submission_id', googleSubmission.id)
                    .maybeSingle();

                  if (existingAttempt) {
                    // Already synced, skip to prevent duplicate
                    continue;
                  }
                }

                // Find student by Google Classroom ID
                let { data: studentProfile } = await adminClient
                  .from('profiles')
                  .select('id')
                  .eq('google_classroom_id', googleSubmission.userId)
                  .maybeSingle();

                if (!studentProfile) {
                  // Try to get student info from Google Classroom
                  try {
                    const studentInfo = await callGoogleClassroomAPI(
                      accessToken,
                      'GET',
                      `userProfiles/${googleSubmission.userId}`
                    );

                    if (studentInfo) {
                      const studentEmail = studentInfo.emailAddress || `student_${googleSubmission.userId}@classroom.local`;
                      
                      const authUserId = await findOrCreateStudentAuthUser(
                        adminClient,
                        studentEmail,
                        googleSubmission.userId,
                        user.id
                      );
                      
                      if (!authUserId) {
                        continue;
                      }

                      const fullName = `${studentInfo.name?.givenName || ''} ${studentInfo.name?.familyName || ''}`.trim() || 'Student';
                      await adminClient
                        .from('profiles')
                        .update({
                          full_name: fullName,
                          google_classroom_id: googleSubmission.userId,
                          google_email: studentInfo.emailAddress || null,
                        })
                        .eq('id', authUserId);

                      studentProfile = { id: authUserId };
                    } else {
                      continue;
                    }
                  } catch (profileError) {
                    continue;
                  }
                }

                // Extract answer from quiz submission
                const answers: Record<string, any> = {};
                const questionId = questions[0]?.id || `q_${quizWork.id}`;
                
                if (googleSubmission.shortAnswerSubmission?.answer) {
                  answers[questionId] = googleSubmission.shortAnswerSubmission.answer;
                } else if (googleSubmission.multipleChoiceSubmission?.answer) {
                  answers[questionId] = googleSubmission.multipleChoiceSubmission.answer;
                } else {
                  // Fallback: store submission ID for reference
                  answers[questionId] = null;
                }

                // Calculate max score
                const maxScore = Array.isArray(questions)
                  ? questions.reduce((sum: number, q: any) => sum + (parseInt(q.points) || 1), 0)
                  : 100;

                // Create quiz_attempt - the pre-check above prevents duplicates
                // Use the unique constraint (quiz_id, student_id, started_at) for conflict resolution
                const submittedAt = googleSubmission.submissionHistory?.[0]?.stateHistory?.[0]?.stateTimestamp
                  ? new Date(googleSubmission.submissionHistory[0].stateHistory[0].stateTimestamp).toISOString()
                  : new Date().toISOString();
                
                await (adminClient.from('quiz_attempts') as any).upsert(
                  {
                    quiz_id: quizId,
                    student_id: studentProfile.id,
                    answers: answers,
                    max_score: maxScore,
                    submitted_at: submittedAt,
                    started_at: submittedAt, // Use submitted_at as started_at for conflict resolution
                    google_classroom_submission_id: googleSubmission.id,
                  },
                  {
                    onConflict: 'quiz_id,student_id,started_at',
                  }
                );

                quizSubmissionsSynced++;
              }
              
              // Add quiz submissions to total submissions count
              submissionsSynced += quizSubmissionsSynced;
            } catch (quizSubmissionError) {
              // Continue even if quiz submission sync fails
            }
          }

          if (courseQuizzesSynced > 0) {
            quizzesSynced += courseQuizzesSynced;
          }
        } catch (courseworkError) {
          // Continue even if coursework sync fails
        }

        // Fetch and sync announcements
        try {
          let allAnnouncements: any[] = [];
          let announcementPageToken: string | undefined;
          
          do {
            const announcementsResponse = await callGoogleClassroomAPI(
              accessToken,
              'GET',
              `courses/${gcCourse.id}/announcements?pageSize=100${announcementPageToken ? `&pageToken=${announcementPageToken}` : ''}`
            );
            
            if (announcementsResponse.announcements) {
              allAnnouncements.push(...announcementsResponse.announcements);
            }
            announcementPageToken = announcementsResponse.nextPageToken;
          } while (announcementPageToken);

          // Always find or create a forum for this course
          let { data: courseForum } = await (adminClient.from('forums') as any)
            .select('id')
            .eq('course_id', courseId)
            .maybeSingle();

          if (!courseForum) {
            const { data: newForum, error: forumError } = await (adminClient.from('forums') as any)
              .insert({
                course_id: courseId,
                name: `${gcCourse.name} - Announcements`,
                description: 'Google Classroom announcements and course updates',
                is_public: true,
                created_by: user.id,
              })
              .select()
              .single();

            if (forumError || !newForum) {
              throw forumError;
            }
            courseForum = newForum;
          }

          if (allAnnouncements.length > 0) {
            let courseAnnouncementsSynced = 0;
            for (const announcement of allAnnouncements) {
              if (!announcement.id) {
                continue;
              }

              // Find the author profile
              let authorId = user.id;
              
              if (announcement.creatorUserId) {
                if (announcement.creatorUserId === integration.google_classroom_id) {
                  authorId = user.id;
                } else {
                  const { data: creatorProfile } = await adminClient
                    .from('profiles')
                    .select('id, full_name, email')
                    .eq('google_classroom_id', announcement.creatorUserId)
                    .maybeSingle();
                  
                  if (creatorProfile) {
                    authorId = (creatorProfile as any).id;
                  } else {
                    authorId = user.id;
                  }
                }
              }
              
              // Ensure the author profile has full_name set
              const { data: authorProfile } = await adminClient
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', authorId)
                .maybeSingle();
              
              if (authorProfile && !(authorProfile as any).full_name && (authorProfile as any).email) {
                const emailName = (authorProfile as any).email.split('@')[0];
                await (adminClient.from('profiles') as any)
                  .update({
                    full_name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
                  })
                  .eq('id', authorId);
              }

              // Check if announcement already exists
              const { data: existingAnnouncement } = await (adminClient.from('forum_messages') as any)
                .select('id')
                .eq('google_classroom_announcement_id', announcement.id)
                .maybeSingle();

              // Upsert announcement as forum message
              await (adminClient.from('forum_messages') as any).upsert(
                {
                  forum_id: (courseForum as any).id,
                  author_id: authorId,
                  content: announcement.text || 'Announcement',
                  is_pinned: false,
                  google_classroom_announcement_id: announcement.id,
                  google_classroom_alternate_link: announcement.alternateLink || null,
                  google_classroom_materials: announcement.materials || null,
                  google_classroom_state: announcement.state || 'PUBLISHED',
                  google_classroom_creation_time: announcement.creationTime 
                    ? new Date(announcement.creationTime).toISOString() 
                    : null,
                  google_classroom_update_time: announcement.updateTime 
                    ? new Date(announcement.updateTime).toISOString() 
                    : null,
                  created_at: announcement.creationTime 
                    ? new Date(announcement.creationTime).toISOString() 
                    : new Date().toISOString(),
                  updated_at: announcement.updateTime 
                    ? new Date(announcement.updateTime).toISOString() 
                    : new Date().toISOString(),
                },
                {
                  onConflict: 'google_classroom_announcement_id',
                }
              );

              // Only count if it's a new announcement
              if (!existingAnnouncement) {
                courseAnnouncementsSynced++;
              }
            }
            
            announcementsSynced += courseAnnouncementsSynced;
          }
        } catch (announcementsError) {
          // Continue even if announcements sync fails
        }
      } catch (courseError) {
        errorCount++;
        continue;
      }
    }

    // Update sync status to completed
    await adminClient
      .from('google_classroom_integrations')
      .update({
        sync_status: 'completed',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errorCount,
        total: allCourses.length,
        studentsSynced,
        assignmentsSynced,
        submissionsSynced,
        quizzesSynced,
        announcementsSynced,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    // Update sync status to error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const authHeader = req.headers.get('Authorization');
      
      if (authHeader) {
        const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await adminClient
            .from('google_classroom_integrations')
            .update({
              sync_status: 'error',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        }
      }
    } catch (updateError) {
      // Ignore update errors
    }

    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to sync from Google Classroom',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
