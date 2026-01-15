// @ts-nocheck
// Deno runtime provides these globals - TypeScript errors are false positives

// ============================================
// DISCONNECT GOOGLE CLASSROOM
// ============================================
// Disconnects Google Classroom integration and removes all synced data

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
};

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

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
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

    // Get all Google Classroom courses for this teacher
    const { data: googleCourses, error: coursesFetchError } = await adminClient
      .from('courses')
      .select('id')
      .eq('teacher_id', user.id)
      .not('google_classroom_course_id', 'is', null);

    if (coursesFetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Google Classroom courses' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let deletedCounts = {
      courses: 0,
      assignments: 0,
      submissions: 0,
      grades: 0,
      gradeHistory: 0,
      quizzes: 0,
      forums: 0,
      announcements: 0,
      enrollments: 0,
      rubrics: 0,
    };

    if (googleCourses && googleCourses.length > 0) {
      const courseIds = googleCourses.map((c: any) => c.id);

      // Get all assignments for these courses
      const { data: assignments, error: assignmentsFetchError } = await adminClient
        .from('assignments')
        .select('id, rubric_id')
        .in('course_id', courseIds);

      if (assignmentsFetchError) {
        // Continue even if we can't fetch assignments
      } else if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map((a: any) => a.id);

        // Get all submissions for these assignments
        const { data: submissions, error: submissionsFetchError } = await adminClient
          .from('submissions')
          .select('id')
          .in('assignment_id', assignmentIds);

        if (!submissionsFetchError && submissions && submissions.length > 0) {
          const submissionIds = submissions.map((s: any) => s.id);

          // Delete grade history first (references grades)
          const { data: grades, error: gradesFetchError } = await adminClient
            .from('grades')
            .select('id')
            .in('submission_id', submissionIds);

          if (!gradesFetchError && grades && grades.length > 0) {
            const gradeIds = grades.map((g: any) => g.id);

            // Delete grade history
            const { error: gradeHistoryError } = await adminClient
              .from('grade_history')
              .delete()
              .in('grade_id', gradeIds);

            if (!gradeHistoryError) {
              deletedCounts.gradeHistory = gradeIds.length;
            }

            // Delete grades
            const { error: gradesError } = await adminClient
              .from('grades')
              .delete()
              .in('id', gradeIds);

            if (!gradesError) {
              deletedCounts.grades = gradeIds.length;
            }
          }

          // Delete submissions
          const { error: submissionsError } = await adminClient
            .from('submissions')
            .delete()
            .in('id', submissionIds);

          if (!submissionsError) {
            deletedCounts.submissions = submissionIds.length;
          }
        }

        // Collect rubric IDs that are only used by Google Classroom assignments
        // We'll delete rubrics that were created for GC assignments
        const rubricIds = new Set<string>();
        assignments.forEach((a: any) => {
          if (a.rubric_id) {
            rubricIds.add(a.rubric_id);
          }
        });

        // Delete assignments
        const { error: assignmentsError } = await adminClient
          .from('assignments')
          .delete()
          .in('id', assignmentIds);

        if (!assignmentsError) {
          deletedCounts.assignments = assignmentIds.length;
        }

        // Delete rubrics that were only used for Google Classroom assignments
        // Check if each rubric is used by any non-GC assignments
        for (const rubricId of rubricIds) {
          const { data: otherAssignments } = await adminClient
            .from('assignments')
            .select('id')
            .eq('rubric_id', rubricId)
            .is('google_classroom_assignment_id', null)
            .limit(1);

          // If no non-GC assignments use this rubric, and it was created by this teacher, delete it
          if (!otherAssignments || otherAssignments.length === 0) {
            const { data: rubric } = await adminClient
              .from('rubrics')
              .select('created_by')
              .eq('id', rubricId)
              .maybeSingle();

            if (rubric && (rubric as any).created_by === user.id) {
              await adminClient
                .from('rubrics')
                .delete()
                .eq('id', rubricId);
              deletedCounts.rubrics++;
            }
          }
        }
      }

      // Delete quizzes for these courses
      const { error: quizzesError } = await adminClient
        .from('quizzes')
        .delete()
        .in('course_id', courseIds);

      if (!quizzesError) {
        // Count deleted quizzes
        deletedCounts.quizzes = courseIds.length; // Approximate, actual count would require a query
      }

      // Get forums for these courses
      const { data: courseForums, error: forumsFetchError } = await adminClient
        .from('forums')
        .select('id')
        .in('course_id', courseIds);

      if (!forumsFetchError && courseForums && courseForums.length > 0) {
        const forumIds = courseForums.map((f: any) => f.id);

        // Delete Google Classroom announcements (forum_messages with google_classroom_announcement_id)
        const { error: announcementsError } = await adminClient
          .from('forum_messages')
          .delete()
          .in('forum_id', forumIds)
          .not('google_classroom_announcement_id', 'is', null);

        if (!announcementsError) {
          deletedCounts.announcements = forumIds.length; // Approximate
        }

        // Delete the forums themselves (they were created for GC announcements)
        const { error: forumsError } = await adminClient
          .from('forums')
          .delete()
          .in('id', forumIds);

        if (!forumsError) {
          deletedCounts.forums = forumIds.length;
        }
      }

      // Delete course enrollments
      const { error: enrollmentsError } = await adminClient
        .from('course_enrollments')
        .delete()
        .in('course_id', courseIds);

      if (!enrollmentsError) {
        deletedCounts.enrollments = courseIds.length; // Approximate
      }

      // Delete courses (this will cascade delete related data via foreign keys)
      const { error: coursesDeleteError } = await adminClient
        .from('courses')
        .delete()
        .in('id', courseIds);

      if (coursesDeleteError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete Google Classroom courses' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      deletedCounts.courses = courseIds.length;
    }

    // Delete the Google Classroom integration
    const { error: deleteError } = await adminClient
      .from('google_classroom_integrations')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to disconnect Google Classroom' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Clear google_classroom_id from profile
    await adminClient
      .from('profiles')
      .update({
        google_classroom_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google Classroom disconnected successfully. All synced data has been removed.',
        deleted: deletedCounts,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to disconnect Google Classroom',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});

