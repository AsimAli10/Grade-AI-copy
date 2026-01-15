// @ts-nocheck
// Deno runtime provides these globals - TypeScript errors are false positives

// ============================================
// SYNC GRADES TO GOOGLE CLASSROOM
// ============================================
// Syncs grades from GradeAI back to Google Classroom submissions

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
  // Clean endpoint - remove leading slash if present
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
    return null; // No content
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

Deno.serve(async (req) => {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Initialize Supabase client
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

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { submissionId, assignmentId, courseId } = body;

    if (!submissionId || !assignmentId) {
      return new Response(
        JSON.stringify({ error: 'Missing submissionId or assignmentId' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the submission and grade data
    // First get submission
    const { data: submissionData, error: subError } = await adminClient
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();

    if (subError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch submission' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!submissionData) {
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get assignment
    const { data: assignmentData, error: assignError } = await adminClient
      .from('assignments')
      .select(`
        *,
        courses!assignments_course_id_fkey(
          *,
          google_classroom_course_id
        )
      `)
      .eq('id', (submissionData as any).assignment_id)
      .maybeSingle();

    if (assignError || !assignmentData) {
      return new Response(
        JSON.stringify({ error: 'Assignment not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get grade
    const { data: gradeData, error: gradeError } = await adminClient
      .from('grades')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (gradeError || !gradeData) {
      return new Response(
        JSON.stringify({ error: 'Grade not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const submission = submissionData;
    const assignment = assignmentData;
    const grade = gradeData;

    // Check if assignment has Google Classroom ID
    if (!assignment?.google_classroom_assignment_id) {
      return new Response(
        JSON.stringify({ error: 'Assignment is not linked to Google Classroom' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if submission has Google Classroom ID
    if (!(submission as any).google_classroom_submission_id) {
      return new Response(
        JSON.stringify({ error: 'Submission is not linked to Google Classroom' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

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


    // Check if token is expired and refresh if needed
    let accessToken = integration.access_token;
    const tokenExpiresAt = new Date(integration.token_expires_at);
    const now = new Date();

    if (tokenExpiresAt <= now) {
      // Refresh token using direct API call
      try {
        const refreshed = await refreshGoogleToken(
          integration.refresh_token,
          googleClientId,
          googleClientSecret
        );
        accessToken = refreshed.access_token;

        // Update stored token
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

    // Get the course's Google Classroom ID
    const course = (assignment as any).courses || (assignment as any).course;
    const gcCourseId = course?.google_classroom_course_id || courseId;

    if (!gcCourseId) {
      return new Response(
        JSON.stringify({ error: 'Course is not linked to Google Classroom' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get current submission state from Google Classroom
    const gcSubmissionId = (submission as any).google_classroom_submission_id;
    const gcCourseWorkId = assignment.google_classroom_assignment_id;

    // Get current submission
    const currentSubmission = await callGoogleClassroomAPI(
      accessToken,
      'GET',
      `courses/${gcCourseId}/courseWork/${gcCourseWorkId}/studentSubmissions/${gcSubmissionId}`
    );

    if (!currentSubmission) {
      return new Response(
        JSON.stringify({ error: 'Submission not found in Google Classroom' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Prepare grade data
    const overallScore = parseFloat((grade as any).overall_score) || 0;
    const maxScore = parseFloat((grade as any).max_score) || parseFloat(assignment.max_points) || 100;

    // Update the submission with the grade using PATCH
    try {
      await callGoogleClassroomAPI(
        accessToken,
        'PATCH',
        `courses/${gcCourseId}/courseWork/${gcCourseWorkId}/studentSubmissions/${gcSubmissionId}?updateMask=assignedGrade,draftGrade`,
        {
          assignedGrade: overallScore,
          draftGrade: overallScore, // Also set as draft in case it's not turned in yet
        }
      );
    } catch (error: any) {
      // Check if it's a permission error
      if (error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('ProjectPermissionDenied')) {
        return new Response(
          JSON.stringify({ 
            error: 'Permission denied. Ensure billing is linked to your Google Cloud project and the app is properly configured.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      throw error;
    }

    // If the submission is turned in, return it to the student
    if (currentSubmission.state === 'TURNED_IN') {
      await callGoogleClassroomAPI(
        accessToken,
        'POST',
        `courses/${gcCourseId}/courseWork/${gcCourseWorkId}/studentSubmissions/${gcSubmissionId}:return`,
        {}
      );
    }

    // Update sync status in database
    await adminClient
      .from('submissions')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Grade synced to Google Classroom successfully',
        grade: overallScore,
        maxScore: maxScore,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to sync grade to Google Classroom',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
